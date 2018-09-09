npm cache clear --force
git pull

rm -r _photos && mkdir _photos
rm -r _albums && mkdir _albums

jekyll build

cd _site/.scripts
rm -rf node_modules && npm install
node update.js

git add ../../_photos && git add ../../_albums
git status
read -p "[Enter] to commit & push, [Ctrl+C] to cancel."
git commit -m "Auto-commit: updated pages"
git push

exit 0
