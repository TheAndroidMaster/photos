const path = require("path");
const fs = require('fs');
const request = require('sync-request');
const crypto = require('crypto');
const http = require("http");
const opn = require("opn");

let key = null;
try {
	key = fs.readFileSync(path.join(process.env.HOME, "keys/flickr/key"), 'utf8');
} catch (error) {
	console.error("No Flickr Key:", error);
}

let secret = null;
try {
	secret = fs.readFileSync(path.join(process.env.HOME, "keys/flickr/secret"), 'utf8');
} catch (error) {
	console.error("No Flickr Secret:", error);
}

let token = null;
try {
	token = fs.readFileSync(path.join(process.env.HOME, "keys/flickr/token"), 'utf8');
} catch (error) {
	console.log("No Flickr Token, fetching...");
}

let tokenSecret = null;
try {
	tokenSecret = fs.readFileSync(path.join(process.env.HOME, "keys/flickr/tokenSecret"), 'utf8');
} catch (error) {
	console.log("No Flickr Token Secret, fetching...");
	tokenSecret = "";
	token = null;
}

if (!token) {
	let response = apiRequestSigned("https://www.flickr.com/services/oauth/request_token", [
		"oauth_callback=" + encodeURIComponent("http://127.0.0.1:8080")
	]);
	
	let oauthToken = "";
	let oauthTokenSecret = "";
	
	if (response.includes("oauth_callback_confirmed=true")) {
		console.log("First call successful!");
		oauthToken = response.split("&")[1].substring("oauth_token=".length);
		tokenSecret = response.split("&")[2].substring("oauth_token_secret=".length);
	} else {
		console.log(response);
		return;
	}

	const server = http.createServer((req, res) => {
		if (req.url.includes("oauth_token=")) {
			res.writeHead(200, {"Content-Type": "text/plain"});
			res.write("Token fetched successfully.\n");
			res.end();

			let reqToken = req.url.split("&")[0].substring(req.url.indexOf("oauth_token=") + "oauth_token=".length);
			let reqVerifier = req.url.split("&")[1].substring("oauth_verifier=".length);

			let response = apiRequestSigned("https://www.flickr.com/services/oauth/access_token", [
				"oauth_token=" + reqToken,
				"oauth_verifier=" + reqVerifier
			]);

			if (response.includes("oauth_token=")) {
				let authToken = response.split("&")[1].substring("oauth_token=".length);
				let authTokenSecret = response.split("&")[2].substring("oauth_token_secret=".length);

				fs.writeFileSync(path.join(process.env.HOME, "keys/flickr/token"), authToken);
				fs.writeFileSync(path.join(process.env.HOME, "keys/flickr/tokenSecret"), authTokenSecret);
				console.log("Wrote secrets to file.");
				server.close();
			} else console.log(response);
		} else {
			res.writeHead(500, {"Content-Type": "text/plain"});
			res.write("Unable to fetch Flickr API Token.\n");
			res.end();
		}
	}).listen(8080);

	let url = "https://www.flickr.com/services/oauth/authorize?oauth_token=" + oauthToken + "&perms=read";
	console.log("Opening " + url + "...");
	console.log("\n");
	opn(url);
	
	return;
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

function apiRequestSigned(url, args) {
	args.push("oauth_consumer_key=" + key);
	args.push("oauth_timestamp=" + Math.round((new Date()).getTime() / 1000));
	args.push("oauth_signature_method=HMAC-SHA1");
	args.push("oauth_version=1.0");
	args.push("oauth_nonce=" + Math.floor(Math.random() * 1000000000));
	args.sort();

	let string = "GET&" + encodeURIComponent(url) + "&" + encodeURIComponent(args.join("&"));
	let signature = crypto.createHmac('sha1', secret + "&" + tokenSecret)
			.update(string)
			.digest('base64');

	args.push("oauth_signature=" + encodeURIComponent(signature));
	try {
		return request('GET', url + "?" + args.join("&")).getBody('utf8');
	} catch (e) {		
		let eBody = e.body.toString("utf8");
		if (eBody.includes("oauth_problem=signature_invalid")) {
			let eString = eBody.substring("oauth_problem=signature_invalid&debug_sbs=".length);
			if (string != eString) {
				console.log("Strings inequal!");
				console.log(string);
				console.log(eString);
			} else {
				console.log("Strings equal...");
				console.log(eBody);
			}
		} else console.log(e);
		
		return "";
	}
}
