FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /app
COPY ["Quiz.csproj", "."]
RUN dotnet restore "Quiz.csproj"
COPY . .
RUN dotnet publish "Quiz.csproj" -c Release -o /publish 
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app
COPY --from=build /publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Quiz.dll"]