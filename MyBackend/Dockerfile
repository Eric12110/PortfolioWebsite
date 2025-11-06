# 使用官方 .NET SDK 來建置
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /app

# 複製 csproj 並還原
COPY *.csproj ./
RUN dotnet restore

# 複製剩餘檔案並建置
COPY . ./
RUN dotnet publish -c Release -o out

# 使用 Runtime 執行
FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app/out .
EXPOSE 8080
ENTRYPOINT ["dotnet", "MyBackend.dll"]
