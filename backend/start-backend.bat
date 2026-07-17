@echo off
cd /d C:\Users\Wado2\OneDrive\Desktop\Tv\backend
npx ts-node-dev --respawn --transpile-only src/index.ts > backend-out.log 2> backend-err.log
