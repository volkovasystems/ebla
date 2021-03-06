var fs = require( "fs" );
var childprocess = require( "child_process" );
var async = require( "async" );
var _ = require( "underscore" );
var optimist = require( "optimist" );
var vm = require( "vm" );

var readPackageConfiguration = function readPackageConfiguration( callback ){
	var packageConfigurationPath = "./library-node/package.json";
	if( !fs.existsSync( packageConfigurationPath ) ){
		callback( new Error( "package configuration not found" ) );
	}else{
		fs.readFile( packageConfigurationPath,
			function( error, configuration ){
				if( error ){
					console.log( error );
					callback( error );
				}else{
					configuration = JSON.parse( configuration );
					callback( null, configuration );			
				}
			} );	
	}	
};

var extractDependencyList = function extractDependencyList( configuration, callback ){
	var dependencyList = configuration.dependencies;
	callback( null, dependencyList );
};

var readNodeModulesDirectory = function readNodeModulesDirectory( dependencyList, callback ){
	var nodeModuleDirectory = "./library-node/node_modules";
	if( !fs.existsSync( nodeModuleDirectory ) ){
		callback( new Error( "node module directory not found" ) );
	}else{
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
									callback( error );
								}else if( fileStatistic 
									&& fileStatistic.isDirectory( ) )
								{
									callback( null, {
										"path": filePath,
										"name": fileName
									} );
								}else{
									callback( null, null );
								}
							} );
					},
					function( error, directoryList ){
						if( error ){
							console.log( error );
							callback( error );
						}else{
							directoryList = _.compact( directoryList );
							var moduleList = { };
							_.chain( directoryList )
								.compact( )
								.each( function( directoryData ){
									moduleList[ directoryData.name ] = directoryData.path
								} );
							callback( null, moduleList, dependencyList );	
						}
					} );
			} );	
	}
};

var readNodeModules = function readNodeModules( callback ){
	readNodeModulesDirectory( null, callback );
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
				chores( innerNodeModuleCommand, callback );
			},

			function( callback ){
				chores( outerNodeModuleCommand, callback );
			}
		],
		function( error, results ){
			if( error ){
				console.log( error );
				callback( error );
			}else{
				/*
					TODO: Check for validity of the modules by requiring them
						in a local scoped environment.
					If the require is successfull then the module is safe to use.
				*/

				async.waterfall( [
						readNodeModules,
						
						//Create an engine for requiring these modules.
						function( moduleList, callback ){
							async.each( _.keys( moduleList ),
								function( module, callback ){
									try{

									}
								},
								function( ){

								} );
						}
					] );

				try{

				}

			}
			
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
			}else{
				if( isComplete ){
					updateDependencies( callback );
				}else{
					completeDependencies( callback );
				}	
			}
		} );
};

/*
	This will check if dependencies needs update.
*/
var checkDependencies = function checkDependencies( callback ){
	async.waterfall( [
			readPackageConfiguration,

			function( configuration, callback ){
				var dependencyList = configuration.dependencies;
				dependencyList = _.keys( dependencyList );
				var command = "npm outdated ";
				async.map( dependencyList,
					function( dependency, callback ){
						work( command + dependency,
							function( error, state, output ){
								if( error ){
									console.log( error );
									callback( error );
								}else{
									callback( null, output );	
								}
							} );
					},
					function( error, outputList ){
						if( error ){
							console.log( error );
							callback( error );
						}else{
							var needsUpdate = !_.isEmpty( outputList );
							callback( null, needsUpdate );
							}
					} );
			}
		],
		function( error, needsUpdate ){
			//I'm doing this for readability's sake.
			if( error ){
				console.log( error );
				callback( error );
			}else{
				callback( null, needsUpdate );	
			}
		} );
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
								callback( error );
							}else{
								callback( null, {
									"needsInstallment": true
								} );	
							}
						} );
				}else{
					//Check here if needed update
					checkDependencies( function( error, needsUpdate ){
						callback( error, {
							"needsUpdate": needsUpdate
						} );
					} );
				}
			},

			//Execute if update or completion.
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
				callback( error );
			}else{
				callback( null, state );	
			}
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