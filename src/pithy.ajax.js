/*
Pithy.js.teemplate.js
*/

;(function(){

	var toString = Object.prototype.toString;
	var slice = Array.prototype.slice;
	var push = Array.prototype.push;
	function create_request() {
		var b = null;
		if (window.XMLHttpRequest) {
			b = new XMLHttpRequest();
			create_request = function() {
				return new XMLHttpRequest();
			}
		} else {
			if (window.ActiveXObject) {
				var httplist = ["MSXML2.XMLHttp.3.0", "MSXML2.XMLHttp", "Microsoft.XMLHttp", "MSXML2.XMLHttp.5.0", "MSXML2.XMLHttp.4.0"];
				for (var i = httplist.length - 1; i >= 0; i--) {
					try {
						create_request = (function(obj) {
							return function() {
								return new ActiveXObject(obj);
							}
						})(httplist[i]);
						b = create_request();
					} catch (ex) {}
				}
			}
		}
		return b;
	};
	function encode(src){
		if(!src || typeof src != 'string'){
			return '';
		}
		return encodeURIComponent(src).replace(/\+/g, '%2B');
	}
	function get_type(type){
		if(!type) {
			throw 'unknown type';
		}
		return type.replace(/\[object (.+?)\]/, '$1').toLowerCase();
	}
	function encode_fields(value, name){
		if(value === null || value === undefined){
			return '';
		}
		var type = get_type(toString.call(value));
		switch(type){
			case 'number':
			case 'boolean':
				value = value.toString();
			case 'string':
				return encode(value);
			case 'array':
				return value
				.map(encode_fields)
				.join('&' + name + '=');
			case 'object':
				return encode_object(value);
			default:
				return '';
		}
	}
	function encode_object(data){
		var result = [];
		for(var name in data){
			if(!data.hasOwnProperty(name)){
				continue;
			}
			result.push(name + '=' + encode_fields(data[name], name));
		}
		return result.join('&');
	}
	function __response(req, callback, error){
		var _contenttype = req.getResponseHeader('Content-Type');
		if(!_contenttype){
			_contenttype = 'text/html';
		}
		if(_contenttype.indexOf(';') > 0){
			_contenttype = _contenttype.substring(0, _contenttype.indexOf(';'));
		}
		_contenttype = _contenttype.toLowerCase();

		var text = req.responseText;
		switch(_contenttype){
			case 'text/json':
			case 'application/json':
				try{
					callback && callback.call(req, (window.JSON && JSON.parse) ? JSON.parse(text) : (new Function('return ' + text + ';'))() );
				}catch(e){
					error && error.call(req, e);
				}
				return;
		}
		callback && callback.call(req, text);
	}
	function __initlize(){
		var url, callback, error, method, data = null, headers, argtype, argvalue;
		for(var i=0; i < arguments.length; i++){
			argvalue = arguments[i];
			argtype = get_type(toString.call(argvalue));
			(argtype == 'string') && ((!url && (url = argvalue)) || (!method && (method = argvalue)) || (!data && (data = argvalue))) ||
			(argtype == 'function') && ((!callback && (callback = argvalue)) || (!error && (error = argvalue))) ||
			(argtype == 'array') && (headers = argvalue) ||
			(argtype == 'object' && !data) && (data = encode_object(argvalue));
		}
		
		method = method ? method.toUpperCase() : 'GET';

		
		
		var body = data;

		var req = create_request();
		req.onreadystatechange = function(){
			if(this.readyState == 4){
				__response(this, callback, error);
			}
		};
		try{
			req.open(method, url, true);
		}catch(e){
			error && error.call(req, e);
			req = null;
			return;
		}
		var _headers = {};
		if(headers){
			var header = '', idx = -1;
			for(var i=0; i < headers.length; i++){
				header = headers[i];
				if(!header){
					continue;
				}
				idx = header.indexOf(':');
				if(idx > 0 && idx != header.length - 1){
					_headers[header.substring(0, idx)] = true;
					req.setRequestHeader(header.substring(0, idx), header.substring(idx + 1).replace(/^\s+/, ''));
				}
			}
		}
		if(data){
			if(_headers['Content-Type'] !== true){
				req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			}
		}
		req.send(data);
	}

	var __CACHE__ = {};
	var __base = window.location.href + '';
	__base = __base.substr(0, __base.lastIndexOf('/')) + '/';
	__base = __base.substr(__base.indexOf('//') + 2);
	__base = __base.substr(__base.indexOf('/'));

	var __current = __base;
	
	function path(file, base){
		if(file.substr(0, 1) == '/' || /^http(s)?\:\/\//.test(file)){
			return file;
		}
		file = (base || '') + file;
		file = file.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
		var reg = /\/([^\/]+)\/\.\.\//;
		while(reg.test(file)){
			file = file.replace(reg, '/');
		}
		file = file.replace(/\/(\.+)\//, '/');
		return file;
	}
	
	function require(requirements, length, callback){
		
		var results = [], requirement, completed = 0;
		function _callback(){
			completed++;
			if(completed == length){
				callback && callback.apply(null, results);
			}
		}
		for(var i = 0; i < length; i++){
			requirement = requirements[i];
			if(requirement.length > 3 && requirement.slice(-3) != '.js'){
				requirement += '.js';
			}
			if(__CACHE__[requirement]){
				results[i] = __CACHE__[requirement];
				completed++;
				if(completed == length){
					callback && callback.apply(null, results);
				}
				continue;
			}
			require_one(i, requirement, results,  _callback);
		}
	}

	function require_one(i, requirement, results,  callback){
		__initlize(requirement + '?t=' + (+new Date()), function(res){
			load_module(requirement, i, results, res, callback);
		}, function(e){throw e;});
	}

	function _next(requirement, index, results,  next){
		if(requirement.length > 3 && requirement.slice(-3) != '.js'){
			requirement += '.js';
		}
		if(__CACHE__[requirement]){
			results[index] = __CACHE__[requirement];
			next(index + 1);
			return;
		}
		__initlize(requirement + '?t=' + (+new Date()), function(res){
			load_module(requirement, index, results, res, function(i){
				next(i + 1);
			});
		}, function(e){throw e;});
	}

	function next(requirements, length, callback){
		var results = [], completed = 0;
		function __next(index){
			if(index == length){
				callback && callback.apply(null, results);
				return;
			}
			_next(requirements[index], index , results, __next);
		};
		__next(0);
	}
	
	function load_module(requirement, i, results, contents, callback){
		var defined = false;
		var module = { exports : {} };
		var _callback = function(return_value){
			results[i] = return_value === undefined ? module.exports : return_value;
			__CACHE__[requirement] = results[i];
			callback(i);
		}
		if(toString.call(contents) == '[object Object]'){
			_callback(contents);
			return;
		}
		var define = function(){
			defined = true;
			var args = slice.call(arguments, 0);
			if(args.length > 0 && typeof args[0] == 'string'){
				args.shift();
			}
			var fn = null, length = args.length;
			if(length == 0){
				throw 'Exception : define last argument error';
			}
			var last = args.pop();
			if(typeof last != 'function'){
				_callback(last);
				return;
			}
			
			fn = last;
			if(length == 1){
				_callback(fn());
				return;
			}
			
			args.push(function(){
				_callback(fn.apply(null, arguments));
			});
			arguments_parser(args, require);
			return;
		};

		var args = ['module', 'exports', 'requirement', 'define'], 
			values = [module, module.exports, requirement, define];
		var return_value = (new Function(args, contents )).apply(null, values);
		if(defined){
			return;
		}
		_callback(return_value);
	}

	function arguments_parser(args, func){
		var length = args.length;
		if(length < 1){
			return;
		}
		
		var requirements = [], callback = null, base = null, argc, argt, requires_is_array;

		for(var i = 0; i < length; i++){
			argc = args[i];
			argt = get_type(toString.call(argc));
			(argt == 'array') && (requires_is_array = true, push.apply(requirements, argc)) ||
			(argt == 'string' && requires_is_array) && (base = argc) || 
			(argt == 'string') && (requirements.push(argc)) || 
			(argt == 'function') && (callback = argc);
		}
		length = requirements.length;
		if(length == 0){
			return;
		}
		if(base){
			base = path(base, __current);
		}
		for(var i=0; i < length; i++){
			requirements[i] = path(requirements[i], base || __base);
		}
		func(requirements, length, callback);
	}
	__initlize.require = function(){
		arguments_parser(arguments, require);
	};
	__initlize.next = function(){
		arguments_parser(arguments, next);
	};
	__initlize.base = function(value){
		if(value === undefined){
			return __base;
		}
		if(!value){
			return;
		}
		if(value.substr(value.length - 1) != '/'){
			value += '/';
		}
		__base = path(value, __current);
	};
	
	window.AJAX = __initlize;
})();