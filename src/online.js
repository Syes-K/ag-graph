
/**
 * 解决在线版本的防盗问题
 */

var matchUrlNumber = [
	[11667, 12324, 9804, 9412, 11667, 10819, 12324, 13228, 13459], //localhost
	[10407, 11028, 11667, 10204, 3367, 2212, 2212], 							 // file://
	[9412, 11028, 10612, 12324, 10003, 9412, 13459, 9412, 2119, 9804, 12324, 11884, 2212] // aigodata.com
];

var urlNumber = encryptToNumber(location.href);

function hasPermission() {
	var permission = false;
	var urlNumberString = urlNumber.join("!=!");
	matchUrlNumber.forEach(function (n) {
		var nstr = n.join("!=!");
		if (urlNumberString.indexOf(nstr) >= 0) {
			permission = true;
		}
	});
	return permission;
}

// 将字符串加密成数字
function encryptToNumber(str) {
	var strAscii = new Array();//用于接收ASCII码
	for (var i = 0; i < str.length; i++) {
		strAscii[i] = str.charCodeAt(i) * str.charCodeAt(i) + 3;//只能把字符串中的字符一个一个的解码
	}
	return strAscii
}

if (!hasPermission()) {
	throw new Error("ag-graph error");
}
