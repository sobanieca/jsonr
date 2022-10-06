# 1.2.0

* Fixed console colors so they are compatible with dark background in console. Default ConsoleLogger colors are way too dark.

# 1.1.0

* Response status text added to logs
* Verbose mode (-v) will log request with headers as well (so it's more convenient to report issues with given endpoint)
* Fixed response body logs to console so it supports objects of depth up to 100
* Request raw mode (-r) introduced - by default all tabs and new lines in request body defined in http file will be removed. 
  This option disables this behaviour.

# 1.0.0

* Initial release
