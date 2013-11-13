var fs = require( "fs" );
var childprocess = require( "child_process" );
var async = require( "async" );
var _ = require( "underscore" );
var optimist = require( "optimist" );

var readNodeModulesDirectory = function readNodeModulesDirectory( callback ){
	var nodeModuleDirectory = "./library-node/node_modules";
	fs.readdir( "./library-node/node_modules",
		function( error, fileList ){
			async.map( fileList,
				function( fileName, callback ){
					var filePath = nodeModuleDirectory + fileName;
					fs.stat( filePath,
						function( error, fileStatistic ){
							if( error ){
								console.log( error );
							}
							if( fileStatistic 
								&& fileStatistic.isDirectory( ) )
							{
								callback( null, {
									"path": filePath,
									"name": fileName
								} );
							}else{
								callback( error );
							}
						} );
				},
				function( error, directoryList ){
					if( error ){
						console.log( error );
					}
					var moduleList = { };
					_.chain( directoryList )
						.compact( )
						.each( function( directoryData ){
							moduleList[ directoryData.name ] = directoryData.path
						} );
					callback( error, moduleList );
				} );
		} );
};

var readPackageConfiguration = function readPackageConfiguration( ){

};

var interpolateExistingModules = function interpolateExistingModules( ){

};

var addModule = function addModule( moduleName ){

};

var boot = function boot( ){

};