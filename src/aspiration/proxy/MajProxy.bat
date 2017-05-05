@ECHO OFF
node download_list
@echo %1 | find "AUTO"
@if %errorlevel% EQU 0 goto :Fin
pause;
:Fin
