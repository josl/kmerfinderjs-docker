"use strict";angular.module("cgeUploaderApp",["ngAnimate","ngCookies","ngMessages","ngResource","ngRoute","ngSanitize","ngTouch","ngFileUpload","ui.bootstrap","ui.grid","ui.grid.resizeColumns","ui.grid.autoResize","cgeUploaderApp.config"]).config(["$routeProvider",function(a){a.when("/",{templateUrl:"views/kmerfinder.html",controller:"KmerFinderCtrl",controllerAs:"kmerfinder"}).otherwise({redirectTo:"/"})}]),angular.module("cgeUploaderApp").controller("KmerFinderCtrl",["$scope","API","$http",function(a,b,c){console.log(b),a.isolateFiles=[],a.matches=!1,a.error=!1,a.errorMessage="",a.analize=function(){console.log(a.isolateFiles),a.isolateFiles&&a.isolateFiles.length&&angular.forEach(a.isolateFiles,function(c){console.log(c);var d=new kmerModule.KmerFinderClient(c,"browser","ATGAC",16,1,1,!0,"server",b.url+"kmers","","Bacteria","Kmers");console.log(d),d.findKmers().then(function(a){return d.findMatches(a)}).then(function(b){var d="";console.log(b),b.on("data",function(a){console.log("received "+d.length+" bytes of compressed data"),d+=a}).on("end",function(){var b=JSON.parse(d);console.log(b),console.log(c),c.species=b[0].species,c.match=!0,c.matchesGrid.data=b,a.$apply()})})["catch"](function(b){console.log(b),a.error=!0,a.errorMessage=b,a.$apply()})})}}]),angular.module("cgeUploaderApp").directive("dropFilesButton",function(){return{templateUrl:"templates/dropFilesButton.html",restrict:"E",link:function(a,b,c){a.tabs=a.$parent.tabs,a.filesValid=!1,a.isService=c.isService,a.validate=function(b){return console.log(a.isolateFiles,b),b.match=!1,b.species="",b.matchesGrid={showGridFooter:!0,enableSorting:!0,cellEditableCondition:!0,columnDefs:[{field:"species",width:"50%"},{field:"template",width:"20%"},{field:"score",width:"10%"},{field:"probability",width:"10%"},{field:"ulength",width:"10%"}],data:[]},b.status={isFirstOpen:!0,isFirstDisabled:!1},!0}}}}),angular.module("cgeUploaderApp").run(["$templateCache",function(a){a.put("views/kmerfinder.html",'<div ng-controller="KmerFinderCtrl"> <div class="jumbotron"> <h1 class="text-center"> <span style="color: #3f51b5">KmerFinder</span> <span style="color: #ff5722">JS</span> </h1> <!-- <p>...</p>\n        <p><a class="btn btn-primary btn-lg" href="#" role="button">Learn more</a></p> --> </div> <drop-files-button active="true" is-service="true"></drop-files-button> <div ng-show="isolateFiles.length !== 0" class="well well-lg"> <p class="text-center"> <button id="submitButton" ng-click="analize()" type="button" class="btn btn-material-indigo-500 btn-lg btn-block"> Predict Species </button> </p> <div class="alert alert-danger text-center" role="alert" ng-show="error"> <h3> {{errorMessage}} </h3> </div> <div ng-repeat="f in isolateFiles"> <h3 ng-show="f.match" class="text-center">Congrats! You got a <span style="color: #ff5722">{{f.species}}</span> </h3> <div ng-show="f.match" ui-grid="f.matchesGrid" class="myGrid" ui-grid-auto-resize></div> <!-- <uib-accordion>\n                <uib-accordion-group is-open="f.status">\n                    <uib-accordion-heading>\n                        I can have markup, too!\n                        <i class="pull-right glyphicon" ng-class="{\'glyphicon-chevron-down\': f.status.open, \'glyphicon-chevron-right\': !f.status.open}"></i>\n                    </uib-accordion-heading>\n                    This is just some content to illustrate fancy headings.\n                </uib-accordion-group>\n            </uib-accordion> --> </div> </div> </div>')}]);