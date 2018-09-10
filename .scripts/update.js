---
layout: null
---

const path = require("path");
const fs = require('fs');
const request = require('sync-request');
const cheerio = require('cheerio');

let client = null;
try {
	client = fs.readFileSync(path.join(process.env.HOME, "keys/imgur/id"), 'utf8');
} catch (error) {
	console.error("No Imgur ID:", error);
}

let secret = null;
try {
	secret = fs.readFileSync(path.join(process.env.HOME, "keys/imgur/secret"), 'utf8');
} catch (error) {
	console.error("No Imgur Secret:", error);
}

let token = null;
try {
	token = fs.readFileSync(path.join(process.env.HOME, "keys/imgur/token"), 'utf8');
} catch (error) {
	console.error("No Imgur Token:", error);
}

try {
	let albums = JSON.parse(request('GET', "https://api.imgur.com/3/account/Fennifith/albums/ids/", {
		headers: { 
			"User-Agent": "Fennifith",
			"Authorization": client ? "Client-ID " + client : null
		}
	}).getBody('utf8')).data;

	for (let i = 0; i < albums.length; i++) {					
		let album = JSON.parse(request('GET', "https://api.imgur.com/3/account/Fennifith/album/" + albums[i] + "/", {
			headers: {
				"User-Agent": "Fennifith",
				"Authorization": token ? "Bearer " + token : null
			}
		}).getBody('utf8')).data;

		let images = "";
		for (let i2 = 0; i2 < album.images.length; i2++) {
			let image = album.images[i2];
			images += "  - " + image.id + "\n";

			let file = request('GET', image.link, {}).getBody();
			fs.writeFileSync(path.resolve("../../images/" + image.id + ".jpg"), file);

			fs.writeFileSync(path.resolve("../../_images/" + image.id + ".md"), "---\n"
				+ "layout: image\n"
				+ "imgur: " + image.id + "\n"
				+ "image: images/" + image.id + ".jpg\n"
				+ (image.description ? "description: " + image.description.split(":").join("&#58;").split("-").join("&#8208;") + "\n" : "")
				+ "album: " + album.id + "\n"
				+ "---\n\n");

			console.log("Fetched image " + image.id + " in album " + album.title);
		}
		
		fs.writeFileSync(path.resolve("../../_albums/" + album.id + ".md"), "---\n"
			+ "layout: album\n"
			+ "title: " + album.title + "\n"
			+ (album.description ? "description: " + album.description.split(":").join("&#58;") + "\n" : "")
			+ "album: " + album.id + "\n"
			+ "link: " + album.link + "\n"
			+ "images:\n" + images
			+ "---\n\n");

		console.log("Fetched album " + album.title);
	}
} catch (error) {
	console.error(error);
}
