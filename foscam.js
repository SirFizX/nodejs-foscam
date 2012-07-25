var http = require('http'),
    querystring = require('querystring'),
    fs = require('fs')

var app = {
	
	// defaults
	settings: {
		host:	'192.168.1.239',
		port:	81,
		user:	'admin',
		pass:	''
	},
	
	// overrides
	setup: function( props ) {
		for( var key in props ) {
			app.settings[ key ] = props[ key ]
		}
	},
	
	
	// status
	status: function( cb ) {
		app.talk({
			path:		'get_status.cgi',
			callback:	function( data ) {
				var result = {}
				
				data = data.split('\n')
				for( var d in data ) {
					if( data[d] != '' ) {
						var line = data[d].split('var ')
						line = String(line[1]).split('=')
						line[1] = String(line[1]).replace( /;$/, '' )
						result[ line[0] ] = line[1].substr(0,1) == '\'' ? line[1].substr(1, line[1].length -2) : line[1]
					}
				}
				
				if( result.alarm_status ) {
					switch( result.alarm_status ) {
						case '0': result.alarm_status_str = 'no alarm'; break
						case '1': result.alarm_status_str = 'motion alarm'; break
						case '2': result.alarm_status_str = 'input alarm'; break
					}
				}
				
				if( result.ddns_status ) {
					switch( result.ddns_status ) {
						case '0': result.ddns_status_str = 'No Action'; break
						case '1': result.ddns_status_str = 'It\'s connecting...'; break
						case '2': result.ddns_status_str = 'Can\'t connect to the Server'; break
						case '3': result.ddns_status_str = 'Dyndns Succeed'; break
						case '4': result.ddns_status_str = 'DynDns Failed: Dyndns.org Server Error'; break
						case '5': result.ddns_status_str = 'DynDns Failed: Incorrect User or Password'; break
						case '6': result.ddns_status_str = 'DynDns Failed: Need Credited User'; break
						case '7': result.ddns_status_str = 'DynDns Failed: Illegal Host Format'; break
						case '8': result.ddns_status_str = 'DynDns Failed: The Host Does not Exist'; break
						case '9': result.ddns_status_str = 'DynDns Failed: The Host Does not Belong to You'; break
						case '10': result.ddns_status_str = 'DynDns Failed: Too Many or Too Few Hosts'; break
						case '11': result.ddns_status_str = 'DynDns Failed: The Host is Blocked for Abusing'; break
						case '12': result.ddns_status_str = 'DynDns Failed: Bad Reply from Server'; break
						case '13': result.ddns_status_str = 'DynDns Failed: Bad Reply from Server'; break
						case '14': result.ddns_status_str = 'Oray Failed: Bad Reply from Server'; break
						case '15': result.ddns_status_str = 'Oray Failed: Incorrect User or Password'; break
						case '16': result.ddns_status_str = 'Oray Failed: Incorrect Hostname'; break
						case '17': result.ddns_status_str = 'Oray Succeed'; break
						case '18': result.ddns_status_str = 'Reserved'; break
						case '19': result.ddns_status_str = 'Reserved'; break
						case '20': result.ddns_status_str = 'Reserved'; break
						case '21': result.ddns_status_str = 'Reserved'; break
					}
				}
				
				if( result.upnp_status ) {
					switch( result.upnp_status ) {
						case '0': result.upnp_status_str = 'No Action'; break
						case '1': result.upnp_status_str = 'Succeed'; break
						case '2': result.upnp_status_str = 'Device System Error'; break
						case '3': result.upnp_status_str = 'Errors in Network Communication'; break
						case '4': result.upnp_status_str = 'Errors in Chat with UPnP Device'; break
						case '5': result.upnp_status_str = 'Rejected by UPnP Device, Maybe Port Conflict'; break
					}
				}
				
				cb( result )
			}
		})
	},
	
	
	// camera params
	camera_params: function( cb ) {
		app.talk({
			path:		'get_camera_params.cgi',
			callback:	function( data ) {
				var result = {}
				data.replace( /var ([^=]+)=([^;]+);/g, function( str, key, value ) {
					result[ key ] = parseInt( value )
				})
				cb( result )
			}
		})
	},
	
	
	// control
	control: {
		
		// pan/tilt
		decoder: function( cmd, cb ) {
			
			if( typeof cmd == 'string' && !cmd.match( /^[0-9]+$/ ) ) {
				switch( cmd ) {
					case 'up':                      cmd = 0; break
					case 'stop up':                 cmd = 1; break
					case 'down':                    cmd = 2; break
					case 'stop down':               cmd = 3; break
					case 'left':                    cmd = 4; break
					case 'stop left':               cmd = 5; break
					case 'right':                   cmd = 6; break
					case 'stop right':              cmd = 7; break
					case 'center':                  cmd = 25; break
					case 'vertical patrol':         cmd = 26; break
					case 'stop vertical patrol':    cmd = 27; break
					case 'horizontal patrol':       cmd = 28; break
					case 'stop horizontal patrol':  cmd = 29; break
					case 'io output high':          cmd = 94; break
					case 'io output low':           cmd = 95; break
				}
			}
			
			app.talk({
				path:		'decoder_control.cgi',
				fields:		{ command: cmd },
				callback:	cb
			})
		},
		
		// camera settings
		camera: function( param, value, cb ) {
			
			// fix param
			if( typeof param == 'string' && !param.match( /^[0-9]+$/ ) ) {
				switch( param ) {
					
					case 'brightness':         param = 1; break
					case 'contrast':           param = 2; break
					
					// resolution
					case 'resolution':
						param = 0
						if( typeof value == 'string' && !value.match( /^[0-9]{1,2}$/ ) ) {
							switch( value ) {
								case '320':
								case '320x240':
								case '320*240':
									value = 8
									break
									
								case '640':
								case '640x480':
								case '640*480':
									value = 32
									break
							}
						}
						break
					
					case 'mode':
						param = 3
						if( typeof value == 'string' && !value.match( /^[0-9]$/ ) ) {
							switch( value.toLowerCase() ) {
								case '50':
								case '50hz':
								case '50 hz':
									value = 0
									break
									
								case '60':
								case '60hz':
								case '60 hz':
									value = 1
									break
									
								case 'outdoor':
								case 'outside':
									value = 2
									break
							}
						}
						break
						
					case 'flipmirror':
						param = 5
						if( typeof value == 'string' && !value.match( /^[0-9]$/ ) ) {
							switch( value.toLowerCase() ) {
								case 'default':
									value = 0
									break
									
								case 'flip':
									value = 1
									break
									
								case 'mirror':
									value = 2
									break
									
								case 'flipmirror':
								case 'flip&mirror':
								case 'flip+mirror':
								case 'flip + mirror':
								case 'flip & mirror':
									value = 3
									break
							}
						}
						break
				}
			}
			
			// send it
			app.talk({
				path:		'camera_control.cgi',
				fields: {
					param:	param,
					value:	value
				},
				callback:	cb
			})
			
		}
		
	},
	
	
	// reboot
	reboot: function( cb ) {
		app.talk({
			path:		'reboot.cgi',
			callback:	cb
		})
	},
	
	
	// restore factory
	restore_factory: function( cb ) {
		app.talk({
			path:		'restore_factory.cgi',
			callback:	cb
		})
	},
	
	
	// params
	params: function( cb ) {
		app.talk({
			path:		'get_params.cgi',
			callback:	cb
		})
	},
	
	
	// set
	set: {
		
		// alias
		alias: function( alias, cb ) {
			app.talk({
				path:		'set_alias.cgi',
				fields:		{ alias: alias },
				callback:	cb
			})
		},
		
		// datetime
		datetime: function( props, cb ) {
			app.talk({
				path:		'set_datetime.cgi',
				fields:		props,
				callback:	cb
			})
		}
		
	},
	
	
	// snapshot
	snapshot: function( filepath, cb ) {
		if( !cb && typeof filepath == 'function' ) {
			var cb = filepath
			var filepath = false
		}
		
		app.talk({
			path:		'snapshot.cgi',
			encoding:	'binary',
			callback:	function( bin ) {
				if( filepath ) {
					fs.writeFile( filepath, bin, 'binary', function( err ) {
						if( err ) {
							throw err
							cb( false )
						} else {
							cb( filepath )
						}
					})
				} else {
					cb( bin )
				}
			}
		})
	},
	
	
	// communicate
	talk: function( props ) {
		
		if( !props.fields ) {
			props.fields = {}
		}
		
		props.fields.user = app.settings.user
		props.fields.pwd = app.settings.pass
		path = '/'+ props.path +'?'+ querystring.stringify( props.fields )
		
		// connect
		var req = http.request({
			
			host:		app.settings.host,
			port:		app.settings.port,
			path:		path,
			method:		'GET'
			
		}, function( response ) {
			
			// response
			response.setEncoding( props.encoding ? props.encoding : 'utf8' )
			var data = ''
			
			response.on( 'data', function( chunk ) { data += chunk })
			response.on( 'end', function() {
				
				if( typeof props.callback == 'function' ) {
					props.callback( data )
				}
				
			})
			
		})
		
		// disconnect
		req.end()
		
	}
	
}

// ready
module.exports = app