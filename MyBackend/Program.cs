using System.Net;
using System.Security.Cryptography;
using System.Text;
using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;


var builder = WebApplication.CreateBuilder(args);
var config = builder.Configuration.GetSection("ECPay");

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
app.UseCors();
app.UseDefaultFiles(); 
app.UseStaticFiles();

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
        ["MerchantID"] = merchantId,
        ["MerchantTradeNo"] = tradeNo,
        ["MerchantTradeDate"] = DateTime.Now.ToString("yyyy/MM/dd HH:mm:ss"),
        ["PaymentType"] = "aio",
        ["TotalAmount"] = body.Amount.ToString(),
        ["TradeDesc"] = body.Description,
        ["ItemName"] = string.Join("#", body.Items),
        ["ReturnURL"] = returnUrl,
        ["OrderResultURL"] = orderResultUrl,
        ["ChoosePayment"] = "Credit",
        ["EncryptType"] = "1"
    };

    form["CheckMacValue"] = GenCheckMac(form, config["HashKey"]!, config["HashIV"]!);

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

    // ✅ 整理訂單資料
    var order = new {
        MerchantTradeNo = form["MerchantTradeNo"],
        TradeAmt = form["TradeAmt"],
        PaymentDate = form["PaymentDate"],
        PaymentType = form["PaymentType"],
        RtnCode = form["RtnCode"], 
        RtnMsg = form["RtnMsg"],
        CreatedAt = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss")
    };

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
