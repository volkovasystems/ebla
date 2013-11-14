var fs = require( "fs" );
var childprocess = require( "child_process" );
var async = require( "async" );
var _ = require( "underscore" );
var optimist = require( "optimist" );

var readPackageConfiguration = function readPackageConfiguration( callback ){
	var packageConfigurationPath = "./library-node/package.json";
	fs.readFile( packageConfigurationPath,
		function( error, configuration ){
			if( error ){
				console.log( error );
				callback( error );
				return;
			}
			var dependencyList = JSON.parse( configuration ).dependencies;
			callback( null, dependencyList );
		} );
};

var readNodeModulesDirectory = function readNodeModulesDirectory( dependencyList, callback ){
	var nodeModuleDirectory = "./library-node/node_modules";
	fs.readdir( nodeModuleDirectory,
		function( error, fileList ){
			if( error ){
				console.log( error );
				callback( error );
				return;
			}
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
					callback( error, moduleList, dependencyList );
				} );
		} );
};

var interpolateExistingModules = function interpolateExistingModules( moduleList, dependencyList, callback ){
	for( var dependency in dependencyList ){
		if( !( dependency in moduleList ) ){
			callback( null, false );
			return;
		}
	}
	callback( null, true );
};

var checkModules = function checkModules( callback ){
	async.waterfall( [
			readPackageConfiguration,
			readNodeModulesDirectory,
			interpolateExistingModules
		],
		function( error, isComplete ){
			if( error ){
				console.log( error );
				return;
			}
			if( isComplete ){
				updateDependencies( );
			}else{
				completeDependencies( );
			}
		} );
};

var updateDependencies = function updateDependencies( ){

};

var completeDependencies = function completeDependencies( ){
	var task = childprocess.exec( "cd library-node && npm install" );
	task.on( "close",
		function( ){

		} );
};

var addModule = function addModule( moduleName ){

};

var boot = function boot( ){
	async.waterfall( [
		],
		function( error, result ){

		} );
};