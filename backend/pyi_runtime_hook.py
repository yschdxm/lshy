# PyInstaller runtime hook：无控制台窗口时把 stdout/stderr 重定向到 exe 同级日志文件，
# 否则冻结版报错会无声消失
import os
import sys

if getattr(sys, "frozen", False):
    log_path = os.path.join(os.path.dirname(sys.executable), "lingshan.log")
    try:
        log_file = open(log_path, "a", encoding="utf-8", buffering=1)
        sys.stdout = log_file
        sys.stderr = log_file
    except OSError:
        pass  # 日志文件被占用等情况下静默跳过，不影响启动
