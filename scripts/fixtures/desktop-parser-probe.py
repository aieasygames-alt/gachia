"""Inspect the real desktop parser without permitting runtime operations, including in CI."""
import importlib.util
import os
from pathlib import Path
import sys
from unittest.mock import patch

manager = Path(__file__).resolve().parents[2] / 'services/content-cms/scripts/desktop.py'
spec = importlib.util.spec_from_file_location('desktop_parser_probe', manager)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)
sys.argv = [str(manager), *sys.argv[1:]]


def forbidden(*args, **kwargs):
    raise AssertionError('Parser-only probe forbids file/process/network access')


# Only this blocked child may reach argparse; the real CLI keeps its CI rejection.
with patch.dict(os.environ, {'CI': '', 'GITHUB_ACTIONS': ''}), \
        patch.object(module, 'install', forbidden), patch.object(module, 'settings', forbidden), \
        patch('builtins.open', forbidden), patch('subprocess.run', forbidden), \
        patch('socket.socket', forbidden), patch('urllib.request.urlopen', forbidden):
    module.main()
