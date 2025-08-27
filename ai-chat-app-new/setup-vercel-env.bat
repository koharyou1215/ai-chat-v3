@echo off
echo Setting up Vercel environment variables...

echo Setting NEXT_PUBLIC_GEMINI_API_KEY...
echo AIzaSyBduLUUsIy206C7fzMCs8u6Oi0YsESvOR0 | npx vercel env add NEXT_PUBLIC_GEMINI_API_KEY production

echo Setting BLOB_READ_WRITE_TOKEN...
echo vercel_blob_rw_placeholder_token_for_development | npx vercel env add BLOB_READ_WRITE_TOKEN production

echo.
echo Environment variables have been added.
echo Please verify them at: https://vercel.com/kous-projects-ba188115/ai-chat-app-new/settings/environment-variables
echo.
echo After verification, redeploy with: npx vercel --prod --force
pause