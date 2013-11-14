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

var testModules = function testModules( callback ){
	/*
		Since ebla is also using the repository maintained by library sub module,
			we just need to push first any changes inside it and pull the node modules used
			by ebla.
	*/

	//Add, commit and push any changes
	var innerNodeModuleCommand = "cd ./library-node/node_modules "
		+ "&& git checkout master "
		+ "&& git pull "
		+ "&& git add --all "
		+ "&& git commit -m 'Update modified sub modules' "
		+ "&& git "

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
				updateDependencies( callback );
			}else{
				completeDependencies( callback );
			}
		} );
};

var updateDependencies = function updateDependencies( callback ){
	var task = childprocess.exec( "cd library-node && npm update" );
	task.on( "close",
		function( ){

		} );
};

var completeDependencies = function completeDependencies( callback ){
	var task = childprocess.exec( "cd library-node && npm install" );
	task.on( "close",
		function( ){

		} );
};

var addModule = function addModule( moduleName ){

};

var boot = function boot( ){
	async.waterfall( [
			checkModules
		],
		function( error, result ){

		} );
};
exports.boot = boot;