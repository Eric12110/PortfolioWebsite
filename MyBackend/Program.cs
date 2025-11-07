using System.Net;
using System.Security.Cryptography;
using System.Text;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;


var builder = WebApplication.CreateBuilder(args);

// ✅ 判斷執行環境 (Development / Production)
var env = builder.Environment.EnvironmentName; // 會自動讀 ASPNETCORE_ENVIRONMENT

var config = builder.Configuration;

foreach (var kv in config.AsEnumerable())
{
    if (kv.Key.Contains("ECPay", StringComparison.OrdinalIgnoreCase))
        Console.WriteLine($"{kv.Key} = {kv.Value}");
}

object ecpayConfig;
// ⚙️ 本地端讀 appsettings.json
if (env == "Development")
{
    var section = config.GetSection("ECPay");
    ecpayConfig = new
    {
        MerchantID = section["MerchantID"],
        HashKey = section["HashKey"],
        HashIV = section["HashIV"],
        ReturnURL = section["ReturnURL"],
        OrderResultURL = section["OrderResultURL"]
    };
    Console.WriteLine("✅ Loaded ECPay settings from appsettings.json");
}
else
{
    // ⚙️ Render / Production 讀環境變數
    ecpayConfig = new
    {
        MerchantID = config["MerchantID"],
        HashKey = config["HashKey"],
        HashIV = config["HashIV"],
        ReturnURL = config["ReturnURL"],
        OrderResultURL = config["OrderResultURL"]
    };
    Console.WriteLine("✅ Loaded ECPay settings from Environment Variables");
}

dynamic ec = ecpayConfig;

// ✅ 加上這段允許跨網域
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithOrigins(
                "http://127.0.0.1:5500", // Live Server 或 VSCode
                "http://localhost:5500",
                "http://127.0.0.1:5101", // 如果你用 VSCode Live Server
                "http://localhost:5101", // 本地測試用
                "https://loginregistration-1dba1.web.app" // Firebase 正式網站
            )
            .AllowCredentials();
    });
});

var app = builder.Build();

// 讓 Render 知道監聽哪個 port
var port = Environment.GetEnvironmentVariable("PORT") ?? "5101";

if (app.Environment.IsDevelopment())
{
    // ✅ 本地開發使用 localhost
    builder.WebHost.UseUrls($"http://localhost:{port}");
    Console.WriteLine($"🌐 Development server listening on http://localhost:{port}");
}
else
{
    // ✅ Render / 雲端使用 0.0.0.0
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
    Console.WriteLine($"🌐 Production server listening on port {port}");
}

app.UseCors();
app.UseDefaultFiles(); 
app.UseStaticFiles();

// 測試首頁
app.MapGet("/", () => "✅ API is running!");

// === 建立訂單 ===
app.MapPost("/api/payment/create", async (HttpContext context) =>
{
    var body = await context.Request.ReadFromJsonAsync<OrderRequest>();
    if (body is null) return Results.BadRequest("invalid payload");

    var merchantId = config["MerchantID"]!;
    var returnUrl = config["ReturnURL"]!;
    var orderResultUrl = config["OrderResultURL"]!;
    var tradeNo = $"EC{DateTime.Now:yyyyMMddHHmmssfff}";

    var form = new SortedDictionary<string, string>(StringComparer.Ordinal)
    {
        ["MerchantID"] = ec.MerchantID,
        ["MerchantTradeNo"] = tradeNo,
        ["MerchantTradeDate"] = DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"),
        ["PaymentType"] = "aio",
        ["TotalAmount"] = body.Amount.ToString(),
        ["TradeDesc"] = body.Description,
        ["ItemName"] = string.Join("#", body.Items),
        ["ReturnURL"] = ec.ReturnURL,
        ["OrderResultURL"] = ec.OrderResultURL,
        ["ChoosePayment"] = "Credit",
        ["EncryptType"] = "1"
    };

    form["CheckMacValue"] = GenCheckMac(form, ec.HashKey, ec.HashIV);
    var fakeForm = new Dictionary<string, string>
    {
        ["MerchantTradeNo"] = "EC20251106183045001",
        ["TradeAmt"] = "1500",
        ["PaymentDate"] = "2025/11/06 18:30:45",
        ["PaymentType"] = "Credit_CreditCard",
        ["RtnCode"] = "1",
        ["RtnMsg"] = "交易成功"
    };

    // === 呼叫綠界物流 API 建立物流單 ===
    var logisticsForm = new SortedDictionary<string, string>(StringComparer.Ordinal)
    {
        ["MerchantID"] = config["MerchantID"]!,
        ["MerchantTradeNo"] = fakeForm["MerchantTradeNo"],
        ["MerchantTradeDate"] = DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"),
        ["LogisticsType"] = "CVS",                // 可改成 Home 或 CVS
        ["LogisticsSubType"] = "FAMI",            // 7-11: UNIMART, 全家: FAMI
        ["GoodsAmount"] = fakeForm["TradeAmt"],
        ["CollectionAmount"] = "0",
        ["IsCollection"] = "N",
        ["GoodsName"] = "攝影作品",
        ["SenderName"] = "Eric",
        ["SenderPhone"] = "0912345678",
        ["SenderZipCode"] = "100",
        ["SenderAddress"] = "台北市中正區忠孝西路1號",
        ["ReceiverName"] = "測試用戶",
        ["ReceiverPhone"] = "0911222333",
        ["ReceiverZipCode"] = "100",
        ["ReceiverAddress"] = "台北市大安區和平東路2段100號",
        ["ServerReplyURL"] = "https://your-backend.com/api/logistics/return", // 物流回傳用
        ["ClientReplyURL"] = "https://your-frontend.com/logistics-result.html"
    };

    using var logisticsClient = new HttpClient();
    var logisticsContent = new FormUrlEncodedContent(logisticsForm);
    var logisticsResponse = await logisticsClient.PostAsync("https://logistics-stage.ecpay.com.tw/Express/Create", logisticsContent);
    var logisticsResult = await logisticsResponse.Content.ReadAsStringAsync();

    Console.WriteLine("🚚 綠界物流建立回傳:");
    Console.WriteLine(logisticsResult);

    return Results.Json(new
    {
        Action = "https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5",
        Params = form
    });
});

// === 綠界後端通知 ===
app.MapPost("/api/return", async (HttpContext ctx) =>
{
    var form = await ctx.Request.ReadFormAsync();

    Console.WriteLine("=== ECPay Return Call ===");
    foreach (var f in form)
        Console.WriteLine($"{f.Key} = {f.Value}");

    var hashKey = config["HashKey"]!;
    var hashIV = config["HashIV"]!;

    if (!ValidateCheckMac(form, hashKey, hashIV))
    {
        Console.WriteLine("❌ CheckMacValue 不一致 — 可能偽造!");
        return Results.Text("0|Fail"); 
    }

    Console.WriteLine("✅ CheckMacValue 驗證成功");
    var fakeForm = new Dictionary<string, string>
    {
        ["MerchantTradeNo"] = "EC20251106183045001",
        ["TradeAmt"] = "1500",
        ["PaymentDate"] = "2025/11/06 18:30:45",
        ["PaymentType"] = "Credit_CreditCard",
        ["RtnCode"] = "1",
        ["RtnMsg"] = "交易成功"
    };

    // ✅ 整理訂單資料
    var order = new {
        MerchantTradeNo = fakeForm["MerchantTradeNo"],
        TradeAmt = fakeForm["TradeAmt"],
        PaymentDate = fakeForm["PaymentDate"],
        PaymentType = fakeForm["PaymentType"],
        RtnCode = fakeForm["RtnCode"], 
        RtnMsg = fakeForm["RtnMsg"],
        CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
    };

    // === 呼叫綠界物流 API 建立物流單 ===
    var logisticsForm = new SortedDictionary<string, string>(StringComparer.Ordinal)
    {
        ["MerchantID"] = config["MerchantID"]!,
        ["MerchantTradeNo"] = fakeForm["MerchantTradeNo"],
        ["MerchantTradeDate"] = DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"),
        ["LogisticsType"] = "CVS",                // 可改成 Home 或 CVS
        ["LogisticsSubType"] = "FAMI",            // 7-11: UNIMART, 全家: FAMI
        ["GoodsAmount"] = fakeForm["TradeAmt"],
        ["CollectionAmount"] = "0",
        ["IsCollection"] = "N",
        ["GoodsName"] = "攝影作品",
        ["SenderName"] = "Eric",
        ["SenderPhone"] = "0912345678",
        ["SenderZipCode"] = "100",
        ["SenderAddress"] = "台北市中正區忠孝西路1號",
        ["ReceiverName"] = "測試用戶",
        ["ReceiverPhone"] = "0911222333",
        ["ReceiverZipCode"] = "100",
        ["ReceiverAddress"] = "台北市大安區和平東路2段100號",
        ["ServerReplyURL"] = "https://your-backend.com/api/logistics/return", // 物流回傳用
        ["ClientReplyURL"] = "https://your-frontend.com/logistics-result.html"
    };

    logisticsForm["CheckMacValue"] = GenCheckMac(logisticsForm, hashKey, hashIV);

    using var logisticsClient = new HttpClient();
    var logisticsContent = new FormUrlEncodedContent(logisticsForm);
    var logisticsResponse = await logisticsClient.PostAsync("https://logistics-stage.ecpay.com.tw/Express/Create", logisticsContent);
    var logisticsResult = await logisticsResponse.Content.ReadAsStringAsync();

    Console.WriteLine("🚚 綠界物流建立回傳:");
    Console.WriteLine(logisticsResult);

    // ✅ 寫入 Firebase (REST方式)
    using var http = new HttpClient();
    await http.PutAsJsonAsync(
        $"https://loginregistration-1dba1.asia-southeast1.firebasedatabase.app/orders/{order.MerchantTradeNo}.json",
        order
    );

    Console.WriteLine("✅ Firebase 訂單已寫入");

    return Results.Text("1|OK");
});

// === 前端導回顯示成功頁 ===
app.MapPost("/payment/result", () => Results.Redirect("/payment-success.html"));

app.Run();

// 查詢物流狀態 API
app.MapGet("/api/logistics/query/{tradeNo}", async (string tradeNo, IConfiguration config) =>
{
    var merchantId = config["ECPay:MerchantID"];
    var hashKey = config["ECPay:HashKey"];
    var hashIV = config["ECPay:HashIV"];

    var form = new SortedDictionary<string, string>
    {
        ["MerchantID"] = merchantId!,
        ["AllPayLogisticsID"] = tradeNo, // 或 LogisticTradeNo
        ["TimeStamp"] = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(),
    };

    form["CheckMacValue"] = GenCheckMac(form, hashKey!, hashIV!);

    using var client = new HttpClient();
    var content = new FormUrlEncodedContent(form);
    var response = await client.PostAsync("https://logistics-stage.ecpay.com.tw/Helper/QueryLogisticsTradeInfo/V2", content);
    var result = await response.Content.ReadAsStringAsync();

    return Results.Text(result, "text/plain");
});

// ===== Helper =====

static string GenCheckMac(IEnumerable<KeyValuePair<string, string>> data, string hashKey, string hashIV)
{
    var raw = string.Join("&", data.OrderBy(x => x.Key, StringComparer.Ordinal)
                                   .Select(x => $"{x.Key}={x.Value}"));

    var toEncode = $"HashKey={hashKey}&{raw}&HashIV={hashIV}".ToLowerInvariant();

    var encoded = WebUtility.UrlEncode(toEncode)!.ToLowerInvariant()
        .Replace("%20", "+")
        .Replace("!", "%21")
        .Replace("(", "%28")
        .Replace(")", "%29")
        .Replace("*", "%2a");

    using var sha256 = SHA256.Create();
    var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(encoded));
    return Convert.ToHexString(bytes);
}

static bool ValidateCheckMac(IFormCollection form, string hashKey, string hashIV)
{
    var dict = form.Where(x => x.Key != "CheckMacValue")
                   .ToDictionary(x => x.Key, x => x.Value.ToString());

    var sorted = dict.OrderBy(x => x.Key, StringComparer.Ordinal);

    var raw = string.Join("&", sorted.Select(kv => $"{kv.Key}={kv.Value}"));

    var encode = WebUtility.UrlEncode($"HashKey={hashKey}&{raw}&HashIV={hashIV}")
        .ToLower()
        .Replace("%20", "+")
        .Replace("!", "%21")
        .Replace("(", "%28")
        .Replace(")", "%29")
        .Replace("*", "%2a");

    using var sha256 = SHA256.Create();
    var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(encode));
    var checkMac = Convert.ToHexString(hash);

    var returnMac = form["CheckMacValue"].ToString().ToUpper();

    Console.WriteLine("CheckMac - Generated: " + checkMac);
    Console.WriteLine("CheckMac - From ECPay: " + returnMac);

    return returnMac == checkMac;
}

public record OrderRequest(int Amount, string Description, List<string> Items);
