[CmdletBinding()]
param(
    [ValidateSet('Start', 'Stop', 'Status')][string]$Mode = 'Start'
)

$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runner = Join-Path $PSScriptRoot 'run-lab.js'
$envFile = Join-Path $root '.env'
$stateDir = Join-Path $root 'data\demo-kit'
$stateFile = Join-Path $stateDir 'active.json'
$guard = [Threading.Mutex]::new($false, 'Local\MarWuy.DC1.Lab.Demo')
$locked = $false

function Get-LabProcesses {
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object {
        # Recognize this kit, npm start and direct launches.
        $_.CommandLine -match '(?i)(?:^|[\\/\s"])(?:DEMO-KIT[\\/]run-lab\.js|src[\\/]bot\.js)(?=["\s]|$)' -and
        $_.CommandLine -match '(?i)(?:^|\s)--env-file(?:=|\s)'
    }
}

function Get-OwnedLab($processes, $record) {
    if ($null -eq $record -or $record.runId -cnotmatch '^[a-f0-9]{32}$') { return }
    $processes | Where-Object {
        $_.ProcessId -eq $record.pid -and
        $_.CreationDate.ToUniversalTime().Ticks.ToString() -eq $record.started -and
        $_.CommandLine.IndexOf('"' + $runner + '"', [StringComparison]::OrdinalIgnoreCase) -ge 0 -and
        $_.CommandLine -match ('\s' + $record.runId + '\s*$')
    }
}

try {
    try { $locked = $guard.WaitOne(45000) }
    catch [Threading.AbandonedMutexException] { $locked = $true }
    if (!$locked) { throw 'Đang có thao tác chuẩn bị Lab. Thử lại sau vài giây.' }

    $running = @(Get-LabProcesses)
    $record = $null
    if (Test-Path -LiteralPath $stateFile) {
        try { $record = Get-Content -LiteralPath $stateFile -Raw | ConvertFrom-Json }
        catch { Write-Warning 'Không đọc được trạng thái launcher. Tiến trình đang chạy vẫn được kiểm tra.' }
    }
    $owned = Get-OwnedLab $running $record

    if ($Mode -eq 'Status') {
        Write-Output "LAB_PROCESSES=$($running.Count)"
        if ($owned) { Write-Output "MANAGED_PID=$($owned.ProcessId)" }
        return
    }
    if ($Mode -eq 'Stop') {
        if (!$owned) {
            if ($running.Count) {
                Write-Output 'Lab đang chạy từ cửa sổ hoặc dịch vụ khác. Dừng ở nơi đã khởi động bot.'
            } else { Write-Output 'Lab đã dừng.' }
            return
        }
        $request = Join-Path (Join-Path $stateDir $record.runId) 'stop.request'
        New-Item -ItemType File -Path $request -Force | Out-Null
        $node = Get-Process -Id $owned.ProcessId -ErrorAction SilentlyContinue
        if ($node -and !$node.WaitForExit(25000)) {
            throw 'Bot chưa dừng. Kiểm tra hướng dẫn sự cố và chờ trước khi thử lại.'
        }
        Remove-Item -LiteralPath $stateFile
        Write-Output 'Đã dừng đúng bot Lab do Demo Kit khởi động.'
        return
    }

    if ($running.Count -gt 1) {
        throw 'Phát hiện nhiều tiến trình có thể là bot Lab. Nhờ người vận hành kiểm tra.'
    }
    if ($running.Count -eq 1) {
        Write-Output 'Đã có tiến trình Lab. Dùng /quests trong Discord để xác nhận bot phản hồi.'
        return
    }

    if (!(Test-Path -LiteralPath $envFile -PathType Leaf)) {
        throw 'Thiếu cấu hình .env. Xem README.md trong thư mục MarStreak.'
    }
    $nodeExe = (Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1).Source
    if (!$nodeExe) { throw 'Máy chưa có Node.js. Xem README.md trong thư mục MarStreak.' }
    $version = & $nodeExe -p 'process.versions.node'
    if ([int]($version -split '\.')[0] -lt 24) { throw 'Máy chạy bot cần Node.js 24 trở lên.' }
    Push-Location -LiteralPath $root
    try {
        & $nodeExe -e "require('discord.js'); require('sharp')" 2>$null
        if ($LASTEXITCODE) { throw 'Thiếu Discord.js hoặc Sharp. Xem bước cài đặt trong README.md.' }
    } finally {
        Pop-Location
    }
    $configKeys = @(Get-Content -LiteralPath (Join-Path $root '.env.example') | ForEach-Object {
        if ($_ -match '^([A-Z_]+)=') { $Matches[1] }
    })
    foreach ($key in $configKeys) {
        if ($null -ne [Environment]::GetEnvironmentVariable($key, 'Process')) {
            throw "Môi trường đang đặt $key và có thể ghi đè .env Lab. Nhờ người vận hành kiểm tra."
        }
    }

    $runId = [guid]::NewGuid().ToString('N')
    $runDir = Join-Path $stateDir $runId
    New-Item -ItemType Directory -Path $runDir -Force | Out-Null
    $out = Join-Path $runDir 'out.log'
    $err = Join-Path $runDir 'err.log'
    $options = @{
        FilePath = $nodeExe
        ArgumentList = '--env-file="' + $envFile + '" "' + $runner + '" ' + $runId
        WorkingDirectory = $root
        WindowStyle = 'Hidden'
        PassThru = $true
        RedirectStandardOutput = $out
        RedirectStandardError = $err
    }
    $node = Start-Process @options

    $info = Get-CimInstance Win32_Process -Filter "ProcessId = $($node.Id)"
    if (!$info) { throw 'Bot thoát ngay khi khởi động. Nhờ người vận hành xem log Lab.' }
    try {
        @{
            pid = $node.Id
            started = $info.CreationDate.ToUniversalTime().Ticks.ToString()
            runId = $runId
        } | ConvertTo-Json -Compress | Set-Content -LiteralPath $stateFile -Encoding UTF8
    } catch {
        New-Item -ItemType File -Path (Join-Path $runDir 'stop.request') -Force | Out-Null
        throw
    }

    $deadline = [DateTime]::UtcNow.AddSeconds(30)
    do {
        $node.Refresh()
        if ($node.HasExited) { throw 'Bot chưa online. Nhờ người vận hành xem log Lab.' }
        if (Select-String -LiteralPath $out -SimpleMatch 'MarStreak sẵn sàng' -Quiet -Encoding UTF8) {
            Write-Output 'MarStreak đã sẵn sàng. Mở Discord rồi chọn /checkin hoặc /quests của app bạn vừa cấu hình.'
            return
        }
        Start-Sleep -Milliseconds 250
    } while ([DateTime]::UtcNow -lt $deadline)
    throw 'Bot chưa báo sẵn sàng sau 30 giây. Xem log trong data/demo-kit/.'
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    if ($locked) { $guard.ReleaseMutex() }
    $guard.Dispose()
}
