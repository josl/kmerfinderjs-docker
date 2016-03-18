angular.module('cgeUploaderApp').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('views/kmerfinder.html',
    "<div ng-controller=\"KmerFinderCtrl\"> <div class=\"jumbotron\"> <h1 class=\"text-center\"> <span style=\"color: #3f51b5\">KmerFinder</span> <span style=\"color: #ff5722\">JS</span> </h1> <!-- <p>...</p>\n" +
    "        <p><a class=\"btn btn-primary btn-lg\" href=\"#\" role=\"button\">Learn more</a></p> --> </div> <drop-files-button active=\"true\" is-service=\"true\"></drop-files-button> <div ng-show=\"isolateFiles.length !== 0\" class=\"well well-lg\"> <p class=\"text-center\"> <button id=\"submitButton\" ng-click=\"analize()\" type=\"button\" class=\"btn btn-material-indigo-500 btn-lg btn-block\"> Predict Species </button> </p> <div ng-repeat=\"f in isolateFiles\"> <h3 ng-show=\"f.match\" class=\"text-center\">Congrats! You got a <span style=\"color: #ff5722\">{{f.species}}</span> </h3> <div ng-show=\"f.match\" ui-grid=\"f.matchesGrid\" class=\"myGrid\" ui-grid-auto-resize></div> <!-- <uib-accordion>\n" +
    "                <uib-accordion-group is-open=\"f.status\">\n" +
    "                    <uib-accordion-heading>\n" +
    "                        I can have markup, too!\n" +
    "                        <i class=\"pull-right glyphicon\" ng-class=\"{'glyphicon-chevron-down': f.status.open, 'glyphicon-chevron-right': !f.status.open}\"></i>\n" +
    "                    </uib-accordion-heading>\n" +
    "                    This is just some content to illustrate fancy headings.\n" +
    "                </uib-accordion-group>\n" +
    "            </uib-accordion> --> </div> </div> </div>"
  );

}]);
