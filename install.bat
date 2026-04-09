@echo off
chcp 65001 >nul
echo ========================================
echo    轻跑如风 - 安装部署工具
echo ========================================
echo.

:: 检查 Python
echo [1/3] 检查 Python 环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python 环境，请先安装 Python 3.8+
    echo 下载地址：https://www.python.org/downloads/
    pause
    exit /b 1
)
python -c "import paddle" >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 正在安装 PaddleOCR...
    pip install paddlepaddle paddleocr
)
echo [完成] Python 环境检查通过

:: 创建必要目录
echo.
echo [2/3] 创建必要目录...
if not exist "data" mkdir data
if not exist "uploads" mkdir uploads
echo [完成] 目录创建完成

:: 启动服务
echo.
echo [3/3] 启动服务...
echo.
echo ========================================
echo 服务启动成功！
echo 访问地址：http://localhost:3000
echo 按 Ctrl+C 停止服务
echo ========================================
echo.

running-tracker.exe

pause
