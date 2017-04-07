@ECHO OFF
node dbg %1 %2 %3 %4 %5
@echo %2 | find "AUTO"
@if %errorlevel% EQU 0 goto :Fin
pause;
:Fin
