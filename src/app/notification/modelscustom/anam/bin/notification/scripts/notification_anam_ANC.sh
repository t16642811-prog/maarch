#!/bin/sh
path='C:\Users\ANAM1406\Desktop\maarch\src\app\notification\modelsbin/notification/'
cd $path
php 'process_event_stack.php' -c C:\Users\ANAM1406\Desktop\maarch\src\app\notification\modelsconfig/config.json -n ANC
cd $path
php 'process_email_stack.php' -c C:\Users\ANAM1406\Desktop\maarch\src\app\notification\modelsconfig/config.json
