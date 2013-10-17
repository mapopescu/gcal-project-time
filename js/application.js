"use strict";

/*
 * TODO
 * - !!! generic demo data
 * - !!! remove apiKey, clientId, e-mail before publishing code
 * - !!! fix: cancelled recurring event is showed when looking at the current week (and when previous to today!)
 * - refresh week button
 * - avoid jumps when going to prev/next week
 * - "empty" weekday - show day, 0h OR show holiday = 8h
 * - show "current" week and today
 * - select default calendar for authenticated user
 * - show authenticated user and selected calendar
 * - (later) allow choosing calendar
 * - (later) allow choosing/switching authenticated user
 */

var gpt = null; //, google, $;

var modConfiguration = {
	VERSION: "2.0",
	clientId: "664723799635", //664723799635.apps.googleusercontent.com
	apiKey: "AIzaSyCmg5qPKH4lGZeh6_5evtgaQ5Y7fc-IuVk",
	appScope: "https://www.googleapis.com/auth/calendar.readonly",
	me: "marius.popescu@pcpal.eu",
	urlCalendarList: "https://www.googleapis.com/calendar/v3/users/me/calendarList",
	//items[10].id = marius.popescu@pcpal.eu
	urlEventList: "https://www.googleapis.com/calendar/v3/calendars/marius.popescu%40pcpal.eu/events?showDeleted=False&"
};

var modData = {
	startDate: null, 
	stopDate: null,
	sheets: null,	
	init: function (aStartDate, aStopDate) {
		var aDate = null;
		modData.startDate = aStartDate;
		modData.stopDate = aStopDate;
		modData.sheets = [];
		for (aDate = modData.startDate; aDate < modData.stopDate; aDate = aDate.addDays(1)) {
			modData.sheets.push({
				sheetDate: aDate, 
				projects: []
			});
		}
	},
	sheetIndex: function (aDate) {
		var i = 0;
		for (i = 0; i < modData.sheets.length; i = i + 1) {
			if (modData.sheets[i].sheetDate.sameDate(aDate)) { return i; }
		}
		return -1;
	},
	sheet: function (aDate) {
		return modData.sheets[modData.sheetIndex(aDate)];
	},
	findProject: function (aDate, aProject) {
		var i = 0, sheet = modData.sheet(aDate);
		for (i = 0; i < sheet.projects.length; i = i + 1) {
			if (sheet.projects[i].name.toLowerCase() === aProject.toLowerCase()) { return sheet.projects[i]; }
		}
		return null;
	},
	addProject: function (aDate, aProject) {
		var sheet = modData.sheet(aDate);
		sheet.projects.push({
			name: aProject, 
			tasks: []
		});
		return modData.findProject(aDate, aProject);
	},
	addTask: function (task) {
		//??? var sheet = modData.sheet(task.startDate);
		//recurring events date is out of current modData period date range!!!
		if (task.startDate >= modData.startDate && task.startDate <= modData.stopDate) {
			var proj = modData.findProject(task.startDate, task.project);
			if (proj === null) {
				proj = modData.addProject(task.startDate, task.project);
			}
			proj.tasks.push(task);
		}
	}	
};

var modSecurity = {
	connect: function (aaa) {
		gpt.security.disconnect();
		gapi.client.setApiKey(gpt.configuration.apiKey);
		gapi.auth.authorize({
			'client_id': gpt.configuration.clientId,
			'scope': gpt.configuration.appScope
			//, immediate: true
			}, aaa); //gpt.presentation.afterAuth);
		return false;
	},
	isConnected: function () {
		return (gapi.auth.getToken() && !gapi.auth.getToken().error);
	},
	disconnect: function () {
	  console.log('disconnect');
		if (gpt.security.isConnected()) {
			//google.accounts.user.logout();
		}
	}
};

/*var modPresentation = {
	handleError: function (e) {
		if (e instanceof Error) {
			// Alert with the error line number, file and message.
			this.window.alert('Error at line ' + e.lineNumber +	' in ' + e.fileName + '\n' + 'Message: ' + e.message);
			// If available, output HTTP error code and status text
			if (e.cause) { this.window.alert('Root cause: HTTP error ' + e.cause.status + ' with status text of: ' + e.cause.statusText); }
		} else { this.window.alert(e.toString()); }
	}
};
*/

var modPresentation = {
	bindEvents: function () {
		$("#btnConnect").bind("click", function () {
			gpt.security.connect(gpt.presentation.afterAuth);
		});
		$("#btnDisconnect").bind("click", function () {
			gpt.security.disconnect();
			gpt.presentation.reset();
		});
		$("#linkPrevWeek").bind("click", function () {
			gpt.presentation.showPreviousWeek();
		});
		$("#linkNextWeek").bind("click", function () {
			gpt.presentation.showNextWeek();
		});
	},
	reset: function() {
		$("#btnConnect").show();
		$("#btnDisconnect").hide();
		$("#divDEMO").show();
		$("#divDATA").hide();
	},
	afterAuth: function(authResult) {
		//console.log('auth complete');
		//console.log(gapi.auth.getToken());
		//console.log(authResult);
		if (gpt.security.isConnected()) {
			$("#btnConnect").hide();
			$("#btnDisconnect").show();
			$("#divDEMO").hide();
			$("#divDATA").show();
			gpt.presentation.showCurrentWeek();
		} else {
			console.log('auth error !!!');
			gpt.presentation.reset();
		}
	},
	getEvents: function(start, end) {
		var url = gpt.configuration.urlEventList + "access_token=" + gapi.auth.getToken().access_token;
		url = url + "&timeMin=" + start.getISODateTime() + "&timeMax=" + end.getISODateTime();
		console.log(url);
		$.getJSON(url, function(json) {
			console.log(json);
			gpt.data.init(start, end);
			gpt.presentation.handleEvents(json);
		});
	},
	
	handleEvents: function (eventList) {
		var crtDate = null, crtProject = null, i = 0,
			crtEvent, aStartDate, aStartTime, aEndDate, aEndTime, eventTitle, aHoursDiff;
		for (i = 0; i < eventList.items.length; i = i + 1) {
			crtEvent = eventList.items[i];
			// filter out deleted events !!!
			/*if (crtEvent.getEventStatus().value === "http://schemas.google.com/g/2005#event.canceled") { continue; }
			if (crtEvent.getTimes()[0] === undefined || crtEvent.getTimes()[0] === null || crtEvent.getTimes()[0].getStartTime().dateOnly) { continue; }*/
			
			//skip full day events
			if (!crtEvent.start || !crtEvent.start.dateTime || !crtEvent.end || !crtEvent.end.dateTime) { continue; }
			//console.log(crtEvent);
			
			aStartDate = new Date(Date.parse(crtEvent.start.dateTime));
			aEndDate = new Date(Date.parse(crtEvent.end.dateTime));
			//console.log(aStartDate);
			//console.log(aEndDate);
			
			if (crtDate === null || crtDate.getDate() !== aStartDate) {
				crtProject = null;
				crtDate = aStartDate;
			}
			if (crtProject === null || crtProject !== crtEvent.summary.split(" ")[0]) {
				var s = crtEvent.summary.split("-");
				if (s.length === 1) {
					s = crtEvent.summary.split(" ");
				}
				crtProject = s[0];
			}
			
			aStartTime = aStartDate.toTime();
			aEndTime = aEndDate.toTime();
			aHoursDiff = aEndDate.hoursDiff(aStartDate);
			//remove "[ProjectName] - " prefix. to improve !!!
			eventTitle = crtEvent.summary.substr(crtProject.length + 1);
			eventTitle += " (" + aStartTime + " - " + aEndTime + " = " + aHoursDiff + " h)";
			gpt.data.addTask({
				startDate: crtDate, 
				project: crtProject, 
				description: eventTitle, 
				startTime: aStartTime, 
				endTime: aEndTime, 
				hours: aHoursDiff
			});
		}
		gpt.presentation.showTimeSheets(gpt.data.sheets);
	},
	showTimeSheets: function (sheets) {
		var weekHours = 0, s, p;
		for (s = 0; s < gpt.data.sheets.length; s = s + 1) {
			if (gpt.data.sheets[s].projects.length > 0) {
				weekHours += gpt.presentation.addDate(gpt.data.sheets[s]);
				for (p = 0; p < gpt.data.sheets[s].projects.length; p = p + 1) {
					gpt.presentation.addProject(gpt.data.sheets[s].projects[p].name);
					gpt.presentation.addProjectTasks(gpt.data.sheets[s].projects[p]);
				}
			}
		}
		$("#spanCrtWeekHours").html(weekHours + "h");
		//((weekHours > 39) ? " label-warning" : "")
		$("#divDATA").append('<p><br/><br/><br/><br/><br/></p>');
	},
	addDate: function (crtSheet) {
		var dayHours = 0, p, t;
		for (p = 0; p < crtSheet.projects.length; p = p + 1) {
			for (t = 0; t < crtSheet.projects[p].tasks.length; t = t + 1) {
				dayHours += crtSheet.projects[p].tasks[t].hours;
			}
		}
		//var warnHours = null;
		//warnHours = ((dayHours > 8) ? " label-warning" : "");
		$("#divDATA").append("<p><h2>" + crtSheet.sheetDate.getMDayName() + ", " + crtSheet.sheetDate.getShortDateDDMM() + " <span class='label" + ((dayHours > 8) ? " label-warning" : "") + "'>" + dayHours + "h</span>" + "</h2></p>");
		return dayHours;
	},
	addProject: function (crtProject) {
		$("#divDATA").append('<p><h4>' + crtProject + '</h4></p>');
	},
	addProjectTasks: function (crtProject) {
		var hours = 0, i;		
		for (i = crtProject.tasks.length - 1; i >= 0; i = i - 1) {
			$("#divDATA").append("<div>" + crtProject.tasks[i].description + "</div>");
			hours += crtProject.tasks[i].hours;
		}
		//add project hours
		$("#divDATA").append("<div><span class='badge'>= " + hours + "h</span></div>");
	},
	
	
	
	showCurrentWeek: function () {
		var firstDate, lastDate;
		if (gpt.presentation.currentDate === undefined) { this.currentDate = new Date(); }
		firstDate = gpt.presentation.currentDate.getFirstDayOfWeek(gpt.presentation.currentDate).clearTime();    
		lastDate = firstDate.addDays(7).clearTime();
		
		$("#spanCrtWeek").html("Week " + gpt.presentation.currentDate.getISOWeek() + ", " + gpt.presentation.currentDate.getISOYear());
		//$("#linkPrevWeek").html("&larr; Week " + (gpt.presentation.currentDate.getISOWeek() - 1));
		//$("#linkNextWeek").html("Week " + (gpt.presentation.currentDate.getISOWeek() + 1) + " &rarr;");
		$("#spanCrtWeekStart").html(firstDate.getShortDateDDMM());
		$("#spanCrtWeekEnd").html(lastDate.getShortDateDDMM());
		$("#spanCrtWeekHours").html("");
		$("#divDATA").html("");
		
		gpt.presentation.getEvents(firstDate, lastDate);
	},	
	showPreviousWeek: function () {
		gpt.presentation.currentDate = gpt.presentation.currentDate.addDays(-7);
		gpt.presentation.showCurrentWeek();
	},	
	showNextWeek: function () {
		gpt.presentation.currentDate = gpt.presentation.currentDate.addDays(7);
		gpt.presentation.showCurrentWeek();
	}
}

var gpt = {
	//attach modules
	presentation: modPresentation,
	configuration: modConfiguration,
	security: modSecurity,
	//calendar: modCalendar,
	data: modData,
	start: function () {
		//$(gpt.configuration.VERSION_SPAN).html("v" + gpt.configuration.VERSION);
		gpt.presentation.bindEvents();
		gpt.presentation.reset();
		//gpt.presentation.doOnGetEvents = gpt.calendar.getEvents;
		//gpt.calendar.doOnReset = gpt.presentation.reset;
		//gpt.calendar.doOnHandleError = gpt.presentation.handleError;
		//gpt.calendar.doAfterGetEvents = gpt.presentation.showTimeSheets;
		//gpt.calendar.init();
	}
};

$(document).ready(function() {
	gpt.start();
});