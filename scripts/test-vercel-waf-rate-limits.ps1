param(
    [Parameter(Mandatory = $true)]
    [string]$BaseUrl,

    [Parameter(Mandatory = $true)]
    [string]$Path,

    [ValidateSet("GET", "POST", "PUT", "PATCH", "DELETE")]
    [string]$Method = "GET",

    [int]$Requests = 25,

    [int]$DelayMs = 100,

    [string]$HeadersPath,

    [string]$BodyPath,

    [string]$ContentType = "application/json",

    [switch]$SkipCertificateCheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if ($Requests -lt 1) {
    throw "Requests must be at least 1."
}

if ($DelayMs -lt 0) {
    throw "DelayMs cannot be negative."
}

if ($SkipCertificateCheck) {
    add-type @"
using System.Net;
using System.Security.Cryptography.X509Certificates;
public class TrustAllCertsPolicy : ICertificatePolicy {
    public bool CheckValidationResult(
        ServicePoint srvPoint,
        X509Certificate certificate,
        WebRequest request,
        int certificateProblem
    ) {
        return true;
    }
}
"@
    [System.Net.ServicePointManager]::CertificatePolicy = New-Object TrustAllCertsPolicy
}

$normalizedBaseUrl = $BaseUrl.TrimEnd("/")
$normalizedPath = if ($Path.StartsWith("/")) { $Path } else { "/$Path" }
$uri = "$normalizedBaseUrl$normalizedPath"

$headers = @{}
if ($HeadersPath) {
    if (-not (Test-Path $HeadersPath)) {
        throw "HeadersPath not found: $HeadersPath"
    }

    $headerJson = Get-Content -Raw -Path $HeadersPath | ConvertFrom-Json -AsHashtable
    foreach ($key in $headerJson.Keys) {
        $headers[$key] = [string]$headerJson[$key]
    }
}

$body = $null
if ($BodyPath) {
    if (-not (Test-Path $BodyPath)) {
        throw "BodyPath not found: $BodyPath"
    }

    $body = Get-Content -Raw -Path $BodyPath
}

$results = New-Object System.Collections.Generic.List[object]
$statusCounts = @{}
$first429At = $null

Write-Host "Testing $Method $uri"
Write-Host "Requests: $Requests, DelayMs: $DelayMs"

for ($index = 1; $index -le $Requests; $index++) {
    $requestParams = @{
        Uri         = $uri
        Method      = $Method
        Headers     = $headers
        ErrorAction = "Stop"
    }

    if ($body -ne $null) {
        $requestParams["Body"] = $body
        $requestParams["ContentType"] = $ContentType
    }

    $statusCode = $null
    $retryAfter = $null

    try {
        $response = Invoke-WebRequest @requestParams
        $statusCode = [int]$response.StatusCode
        if ($response.Headers["Retry-After"]) {
            $retryAfter = $response.Headers["Retry-After"]
        }
    } catch {
        $webResponse = $_.Exception.Response
        if ($null -ne $webResponse) {
            $statusCode = [int]$webResponse.StatusCode
            $retryAfter = $webResponse.Headers["Retry-After"]
        } else {
            $statusCode = -1
        }
    }

    if (-not $statusCounts.ContainsKey($statusCode)) {
        $statusCounts[$statusCode] = 0
    }
    $statusCounts[$statusCode]++

    if ($statusCode -eq 429 -and $null -eq $first429At) {
        $first429At = $index
    }

    $results.Add([pscustomobject]@{
        RequestNumber = $index
        StatusCode    = $statusCode
        RetryAfter    = $retryAfter
    }) | Out-Null

    Write-Host ("[{0}/{1}] status={2}{3}" -f $index, $Requests, $statusCode, $(if ($retryAfter) { " retry-after=$retryAfter" } else { "" }))

    if ($index -lt $Requests -and $DelayMs -gt 0) {
        Start-Sleep -Milliseconds $DelayMs
    }
}

Write-Host ""
Write-Host "Summary"
Write-Host "-------"

foreach ($entry in ($statusCounts.GetEnumerator() | Sort-Object Name)) {
    Write-Host ("HTTP {0}: {1}" -f $entry.Key, $entry.Value)
}

if ($null -ne $first429At) {
    Write-Host "First 429 observed at request: $first429At"
} else {
    Write-Host "No 429 observed."
}

Write-Host ""
$results | Format-Table -AutoSize
