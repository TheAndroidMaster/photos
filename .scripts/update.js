---
layout: null
---

const path = require("path");
const fs = require('fs');
const request = require('sync-request');
const cheerio = require('cheerio');

let key = null;
try {
	key = fs.readFileSync(path.join(process.env.HOME, "keys/flickr/key"), 'utf8');
} catch (error) {
	console.error("No Imgur ID:", error);
}

let secret = null;
try {
	secret = fs.readFileSync(path.join(process.env.HOME, "keys/flickr/secret"), 'utf8');
} catch (error) {
	console.error("No Imgur Secret:", error);
}

try {
	let albums = apiRequest("method=flickr.photosets.getList&user_id=160685305@N03").photosets.photoset;

	for (let i = 0; i < albums.length; i++) {
		albums[i].title = albums[i].title._content;
		albums[i].description = albums[i].description._content;
	
		let photos = apiRequest("method=flickr.photosets.getPhotos&user_id=160685305@N03&photoset_id=" + albums[i].id).photoset.photo;

		let images = "";
		for (let i2 = 0; i2 < photos.length; i2++) {
			images += "  - " + photos[i2].id + "\n";

			let sizes = apiRequest("method=flickr.photos.getSizes&photo_id=" + photos[i2].id).sizes.size;
			if (sizes.length < 1) {
				console.error("ERROR retrieving picture " + photos[i2].title + " (" + photos[i2].id + ") from album " + albums[i].title);
				continue;
			}
			
			let thumbnail = sizes[Math.floor(sizes.length / 2)];
			let original = sizes[sizes.length - 1];
			
			let fileName = photos[i2].id + ".jpeg";
			if (thumbnail && !fs.existsSync(path.resolve("../../images/thumbs/" + fileName))) {
				let file = request('GET', thumbnail.source, {}).getBody();
				fs.writeFileSync(path.resolve("../../images/thumbs/" + fileName), file);
			}

			if (original && !fs.existsSync(path.resolve("../../images/" + fileName ))) {
				let file = request('GET', original.source, {}).getBody();
				fs.writeFileSync(path.resolve("../../images/" + fileName), file);
			}

			fs.writeFileSync(path.resolve("../../_images/" + photos[i2].id + ".md"), "---\n"
				+ "layout: image\n"
				+ "title: " + photos[i2].title + "\n"
				+ "uid: " + photos[i2].id + "\n"
				+ "thumb: images/thumbs/" + fileName + "\n"
				+ "image: images/" + fileName + "\n"
				+ (photos[i2].description ? "description: " + photos[i2].description.split(":").join("&#58;").split("-").join("&#8208;") + "\n" : "")
				+ "album: " + albums[i].id + "\n"
				+ "---\n\n");

			console.log("Fetched image " + photos[i2].id + " (" + photos[i2].title + ") in album " + albums[i].title);
		}
		
		fs.writeFileSync(path.resolve("../../_albums/" + albums[i].id + ".md"), "---\n"
			+ "layout: album\n"
			+ "title: " + albums[i].title + "\n"
			+ (albums[i].description ? "description: " + albums[i].description.split(":").join("&#58;") + "\n" : "")
			+ "uid: " + albums[i].id + "\n"
			+ "link: " + albums[i].link + "\n"
			+ "images:\n" + images
			+ "---\n\n");

		console.log("Fetched album " + albums[i].title);
	}
} catch (error) {
	console.error(error);
}

function apiRequest(args) {
	let response = request('GET', "https://api.flickr.com/services/rest/?" + args + "&api_key=" + key + "&format=json", {}).getBody('utf8');
	return JSON.parse(response.substring(14, response.length - 1));
}
