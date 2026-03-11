$ErrorActionPreference = "Stop"

# Faster local PHP dev server:
# - enable OPcache for CLI server
# - increase OPcache memory for this codebase
# - keep timestamp validation for live coding
php `
  -d opcache.enable=1 `
  -d opcache.enable_cli=1 `
  -d opcache.memory_consumption=256 `
  -d opcache.interned_strings_buffer=16 `
  -d opcache.max_accelerated_files=20000 `
  -d opcache.validate_timestamps=1 `
  -d opcache.revalidate_freq=1 `
  -S localhost:8080 -t . router.php
