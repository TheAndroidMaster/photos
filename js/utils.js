var ElementUtils = {};

ElementUtils.createElement = function(html) {
	var fragment = document.createDocumentFragment();
	var temp = document.createElement('div');
	temp.innerHTML = html;
	while (temp.firstChild) {
		fragment.appendChild(temp.firstChild);
	}

	return fragment;
};

ElementUtils.clearElement = function(element) {
	while (element.firstChild) {
		element.removeChild(element.firstChild);
	}
};

ElementUtils.append = function(element, html) {
	var child = ElementUtils.createElement(html);
	element.appendChild(child);

	ElementUtils.addElementListenerStuff(element);

	if (typeof onSizeChange === "function")
		onSizeChange();
};

ElementUtils.addElementListenerStuff = function(element) {
	if (element.nodeName == "img" || element.nodeName == "IMG") {
		element.addEventListener("load", function() {
			if (!element.className) {
				element.className = "loaded";
			} else if (element.className.indexOf("loaded") < 0) {
 				element.className += " loaded";
			}
		}, false);
	} else if (element.className && element.className.indexOf("loadingimage") >= 0) {
		var img = new Image();
		img.addEventListener("load", function() {
			if (!element.className) {
				element.className = "loaded";
			} else if (element.className.indexOf("loaded") < 0) {
				element.className += " loaded";
			}
		}, false);
		try {
			img.src = element.style["background"].match(/url\(["|']?([^"']*)["|']?\)/)[0].slice(5, -2);
		} catch (e) {
			if (!element.className) {
				element.className = "loaded";
			} else if (element.className.indexOf("loaded") < 0) {
				element.className += " loaded";
			}
		}
	} else if (element.childNodes.length > 0) {
		var children = element.childNodes;
		for (var i = 0; i < children.length; i++) {
			ElementUtils.addElementListenerStuff(children[i]);
		}
	}
}
