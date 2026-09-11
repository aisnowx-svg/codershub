#!/usr/bin/env python3
"""
CODE SOCIAL — Windows Desktop Application
A developer-first social network and workspace for Windows.
Powered by React 19, TypeScript, and PyWebView (Microsoft Edge WebView2).

Usage:
    python main.py                  # Launches desktop workspace (1440x900) [DEFAULT]
    python main.py --dev            # Runs with Vite dev server (hot reload) inside PyWebView
    python main.py --browser        # Runs server and opens in standard external browser
    python main.py --port 5173      # Custom port
"""

import os
import sys
import time
import socket
import argparse
import webbrowser
import subprocess
import threading
from pathlib import Path
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

BASE_DIR = Path(__file__).resolve().parent

BANNER = r"""
======================================================================
   ____ ___  ____  _____   ____   ___   ____ ___    _    _     
  / ___/ _ \|  _ \| ____| / ___| / _ \ / ___|_ _|  / \  | |    
 | |  | | | | | | |  _|   \___ \| | | | |    | |  / _ \ | |    
 | |__| |_| | |_| | |___   ___) | |_| | |___ | | / ___ \| |___ 
  \____\___/|____/|_____| |____/ \___/ \____|___/_/   \_\_____|

                 CODE SOCIAL — WINDOWS DESKTOP APP
                   "Your code is your profile."
======================================================================
"""

def is_port_in_use(port: int, host: str = '127.0.0.1') -> bool:
    """Check if a local TCP port is already in use."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(0.5)
        return s.connect_ex((host, port)) == 0

def wait_for_port(port: int, host: str = '127.0.0.1', timeout: float = 20.0) -> bool:
    """Wait until a local port starts accepting connections."""
    start = time.time()
    while time.time() - start < timeout:
        if is_port_in_use(port, host):
            return True
        time.sleep(0.2)
    return False

class SPARequestHandler(SimpleHTTPRequestHandler):
    """
    HTTP handler that serves static files and falls back to index.html
    for client-side SPA routing (React 19 / Vite).
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR / "dist"), **kwargs)

    def do_GET(self):
        path = self.translate_path(self.path)
        if not os.path.exists(path) or os.path.isdir(path):
            index_path = os.path.join(str(BASE_DIR / "dist"), "index.html")
            if os.path.exists(index_path):
                self.path = "/index.html"
        return super().do_GET()

    def log_message(self, format, *args):
        # Suppress verbose 200/304 request spam in console
        if " 200 " not in str(args) and " 304 " not in str(args):
            super().log_message(format, *args)

def start_http_server(port: int) -> ThreadingHTTPServer:
    """Start Python SPA server for the dist/ folder in a background daemon thread."""
    dist_dir = BASE_DIR / "dist"
    if not (dist_dir / "index.html").exists():
        print("[!] Production bundle not found in dist/. Building now...")
        subprocess.run(["npm", "run", "build"], cwd=str(BASE_DIR), shell=True, check=True)

    server = ThreadingHTTPServer(('127.0.0.1', port), SPARequestHandler)
    server_thread = threading.Thread(target=server.serve_forever, daemon=True)
    server_thread.start()
    return server

def start_dev_server(port: int) -> subprocess.Popen:
    """Start Vite development server in background."""
    node_modules = BASE_DIR / "node_modules"
    if not node_modules.exists():
        print("[!] node_modules missing. Running npm install...")
        subprocess.run(["npm", "install"], cwd=str(BASE_DIR), shell=True, check=True)

    cmd = ["npx", "vite", "--port", str(port), "--host", "127.0.0.1"]
    proc = subprocess.Popen(
        cmd,
        cwd=str(BASE_DIR),
        shell=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    return proc

def launch_pywebview(url: str):
    """Launch the native Windows desktop application window using Edge WebView2."""
    try:
        import webview
    except ImportError:
        print("[!] pywebview is not installed. Installing now...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pywebview"], check=True)
        import webview

    # Full desktop workspace dimensions
    width, height = 1440, 900
    window_title = "CODE SOCIAL — Developer Workspace"
    min_size = (1100, 700)

    print(f"\n[+] Launching CODE SOCIAL Windows Desktop Workspace ({width}x{height})...")
    print("[+] Shortcuts: Press '/' for Search, 'Esc' to close dialogs, 'Ctrl+B' for Build Log.")
    print("[+] Close window to exit.\n")

    webview.create_window(
        title=window_title,
        url=url,
        width=width,
        height=height,
        resizable=True,
        min_size=min_size,
        background_color='#090A0D',
        text_select=True,
    )

    # Start Edge WebView2 desktop message loop
    webview.start(debug=False)

def main():
    parser = argparse.ArgumentParser(description="CODE SOCIAL — Windows Desktop Application")
    parser.add_argument("--desktop", action="store_true", help="Launch in desktop 3-column mode (default)")
    parser.add_argument("--dev", action="store_true", help="Run with Vite dev server (hot reload) in PyWebView")
    parser.add_argument("--browser", action="store_true", help="Open in external web browser instead of PyWebView")
    parser.add_argument("--port", type=int, default=5173, help="Port to run on (default: 5173)")
    args = parser.parse_args()

    # Clear terminal
    if os.name == 'nt':
        os.system('cls')

    print(BANNER)

    port = args.port
    while is_port_in_use(port):
        print(f"[-] Port {port} is busy. Trying {port + 1}...")
        port += 1

    url = f"http://localhost:{port}"

    dev_proc = None
    http_server = None

    if args.dev:
        print(f"[+] Starting Vite dev server on port {port}...")
        dev_proc = start_dev_server(port)
        if not wait_for_port(port, timeout=15.0):
            print(f"[!] Dev server took too long to respond.")
            sys.exit(1)
    else:
        print(f"[+] Starting optimized production SPA server on port {port}...")
        http_server = start_http_server(port)
        time.sleep(0.4)

    print(f"[+] Application running at: {url}")

    if args.browser:
        print(f"[+] Opening {url} in default web browser...")
        webbrowser.open(url)
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
    else:
        launch_pywebview(url)

    # Clean shutdown
    print("\n[*] Shutting down CODE SOCIAL Windows desktop app...")
    if dev_proc:
        dev_proc.terminate()
    if http_server:
        http_server.server_close()
    print("[*] Stopped cleanly.")

if __name__ == "__main__":
    main()
