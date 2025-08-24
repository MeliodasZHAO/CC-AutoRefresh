# Windows 任务计划程序设置脚本
# 需要以管理员权限运行

param(
    [string]$TaskName = "CC-AutoRefresh",
    [string]$Time = "23:55"
)

# 检查管理员权限
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "此脚本需要管理员权限。请以管理员身份运行 PowerShell。"
    exit 1
}

# 获取脚本路径
$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectPath = Split-Path -Parent $ScriptPath
$RunScript = Join-Path $ScriptPath "run_once.bat"

Write-Host "设置 Windows 任务计划程序..."
Write-Host "任务名称: $TaskName"
Write-Host "执行时间: 每天 $Time"
Write-Host "脚本路径: $RunScript"

# 检查脚本是否存在
if (-not (Test-Path $RunScript)) {
    Write-Error "运行脚本不存在: $RunScript"
    exit 1
}

try {
    # 删除已存在的同名任务
    $existingTask = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existingTask) {
        Write-Host "删除已存在的任务: $TaskName"
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }
    
    # 创建新任务
    Write-Host "创建新的定时任务..."
    
    # 任务动作
    $Action = New-ScheduledTaskAction -Execute $RunScript -WorkingDirectory $ProjectPath
    
    # 任务触发器 (每天指定时间)
    $Trigger = New-ScheduledTaskTrigger -Daily -At $Time
    
    # 任务设置
    $Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
    
    # 任务主体 (使用当前用户)
    $Principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive
    
    # 创建任务
    $Task = New-ScheduledTask -Action $Action -Trigger $Trigger -Settings $Settings -Principal $Principal -Description "自动化积分重置任务 - 每天$Time执行"
    
    # 注册任务
    Register-ScheduledTask -TaskName $TaskName -InputObject $Task
    
    Write-Host ""
    Write-Host "任务创建成功！" -ForegroundColor Green
    
    # 显示任务信息
    $RegisteredTask = Get-ScheduledTask -TaskName $TaskName
    Write-Host "任务详情："
    Write-Host "  名称: $($RegisteredTask.TaskName)"
    Write-Host "  状态: $($RegisteredTask.State)"
    Write-Host "  下次运行时间: $((Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo).NextRunTime)"
    
    Write-Host ""
    Write-Host "管理命令："
    Write-Host "  查看任务: Get-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  手动运行: Start-ScheduledTask -TaskName '$TaskName'"
    Write-Host "  删除任务: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
    Write-Host "  查看日志: Get-Content '$ProjectPath\logs\autorefresh.log'"
    
    Write-Host ""
    Write-Host "注意事项："
    Write-Host "1. 首次运行前请编辑 config.json 配置文件"
    Write-Host "2. 确保计算机在执行时间处于开机状态"
    Write-Host "3. 任务将以当前用户身份运行"
    Write-Host "4. 日志文件位置: $ProjectPath\logs\"
    
} catch {
    Write-Error "创建任务失败: $($_.Exception.Message)"
    exit 1
}

Write-Host ""
Write-Host "设置完成！任务将在每天 $Time 自动执行。" -ForegroundColor Green