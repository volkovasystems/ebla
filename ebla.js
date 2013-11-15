var fs = require( "fs" );
var childprocess = require( "child_process" );
var async = require( "async" );
var _ = require( "underscore" );
var optimist = require( "optimist" );

var extractDependencyList = function extractDependencyList( configuration, callback ){
	var dependencyList = JSON.parse( configuration ).dependencies;
	callback( null, dependencyList );
};

var readPackageConfiguration = function readPackageConfiguration( callback ){
	var packageConfigurationPath = "./library-node/package.json";
	fs.readFile( packageConfigurationPath,
		function( error, configuration ){
			if( error ){
				console.log( error );
				callback( error );
				return;
			}
			callback( null, configuration );		
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

	/*
		Pull, add, commit and push any changes
		This will start in the innner node modules
			changes will propagate outside so we have to update them.
		This is tempting to optimize but we should leave it like this.
		The command string might evolve overtime so this is a better solution
			than optimizing things.
	*/
	var innerNodeModuleCommand = "cd ./library-node/node_modules "
		+ "&& git checkout master "
		+ "&& git pull "
		+ "&& git add --all "
		+ "&& git commit -m 'Update modified sub modules' "
		+ "&& git push";

	var outerNodeModuleCommand = "cd ./node_modules "
		+ "&& git checkout master "
		+ "&& git pull "
		+ "&& git add --all "
		+ "&& git commit -m 'Update modified sub modules' "
		+ "&& git push";

	async.series( [
			function( callback ){
				chore( innerNodeModuleCommand, callback );
			},

			function( callback ){
				chore( outerNodeModuleCommand, callback );
			}
		],
		function( error, results ){
			if( error ){
				console.log( error );
				callback( error );
				return;
			}
			/*
				TODO: Check for validity of the modules by requiring them
					in a local scoped environment.
				If the require is successfull then the module is safe to use.
			*/
		} );
};

var checkModules = function checkModules( callback ){
	async.waterfall( [
			readPackageConfiguration,
			extractDependencyList,
			readNodeModulesDirectory,
			interpolateExistingModules
		],
		function( error, isComplete ){
			if( error ){
				console.log( error );
				callback( error );
				return;
			}
			if( isComplete ){
				updateDependencies( callback );
			}else{
				completeDependencies( callback );
			}
		} );
};

var checkDependencies = function checkDependencies( callback ){
	async.waterfall( [
		],
		function( ){

		} )
};

var updateDependencies = function updateDependencies( callback ){
	chore( "cd library-node && npm update", callback );
};

var completeDependencies = function completeDependencies( callback ){
	chore( "cd library-node && npm install", callback );
};

var addModule = function addModule( moduleName, callback ){
	var dependencyList = null;
	async.waterfall( [
			readPackageConfiguration,

			//Insert the dependency with x.x.x version.
			//NOTE: This is strictly implemented. We should always supported updated versions.
			function( configuration, callback ){
				configuration = JSON.parse( configuration );
				dependencyList = configuration.dependencies;
				if( !( moduleName in dependencyList ) ){
					dependencyList[ moduleName ] = "x.x.x";
					configuration = JSON.stringify( configuration );
					callback( error, configuration );
				}else{
					callback( null, configuration );
				}		
			},

			//Test if needs installment or update.
			//If installment, write the configuration to the package configuration first.
			function( configuration, callback ){
				if( !( moduleName in dependencyList ) ){
					var packageConfigurationPath = "./library-node/package.json";
					fs.writeFile( packageConfigurationPath,
						configuration,
						{ "encoding": "utf8" },
						function( error ){
							if( error ){
								console.log( error );
							}
							callback( error, {
								"needsInstallment": true
							} );
						} );
				}else{
					//TODO: Check here if needed update
					callback( null, {
						"needsUpdate": false
					} );
				}
			},

			function( task, callback ){
				if( task.needsInstallment ){
					completeDependencies( callback );
				}else if( task.needsUpdate ){
					updateDependencies( callback );
				}else{
					callback( null, true )
				}
			}
		],
		function( error, state ){
			if( error ){
				console.log( error );
			}
			callback( error, state );
		} );
	} );
};

var boot = function boot( ){
	async.waterfall( [
			checkModules
		],
		function( error, result ){

		} );
};
exports.boot = boot;