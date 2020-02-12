/* jshint esversion: 8 */

(function () {
"use strict";

/*
 * TODO
 * - !!! remove apiKey, clientId, e-mail before publishing code
 * - !!! fix: cancelled recurring event is showed when looking at the current week (and when previous to today!)
 * - refresh week button
 * - show holiday = 8h
 * - show "current" week and today or "Go to current week" button
 * - (later) allow choosing calendar
 */

var gpt = null; //, google, $;

var modConfiguration = {
	VERSION: "4.0",
	clientId: "664723799635", //664723799635.apps.googleusercontent.com
	apiKey: "AIzaSyCmg5qPKH4lGZeh6_5evtgaQ5Y7fc-IuVk",
	appScope: "https://www.googleapis.com/auth/calendar.readonly",
	//me: "",
	urlCalendarList: "https://www.googleapis.com/calendar/v3/users/me/calendarList?",
	//items[10].id = marius.popescu@pcpal.eu
	//urlEventList: ""
	urlEventList: "https://www.googleapis.com/calendar/v3/calendars/",
	urlQuery: "/events?showDeleted=False&"
};

var week = function () {
	return {
		sheets: [],
		hours: function () {
			var h = 0;
			for (var i = 0; i < this.sheets.length; i++) {
				h += this.sheets[i].hours();
			}
			return h;
		}
	}
};

var sheet = function (aDate) {
	return {
		sheetDate: aDate, 
		projects: [],
		hours: function () {
			var h = 0;
			for (var i = 0; i < this.projects.length; i++) {
				h += this.projects[i].hours();
			}
			return h;
		}
	}
};

var project = function(projectName) {
	return {
		name: projectName, 
		tasks: [],
		summary: function () {
			var d  = "", i;		
			for (i = this.tasks.length - 1; i >= 0; i--) {
				d += this.tasks[i].description + "<br/>";
			}
			return d;
		},
		is: function (aName) {
			return this.name.toLowerCase() === aName.toLowerCase()
		},
		hours: function () {
			var h  = 0, i;		
			for (i = this.tasks.length - 1; i >= 0; i--) {
				h += this.tasks[i].hours;
			}
			return h;
		}
	}
};

var modData = {
	startDate: null, 
	stopDate: null,
	calendar: null,
	init: function (aStartDate, aStopDate) {
		var aDate = null;
		modData.startDate = aStartDate;
		modData.stopDate = aStopDate;
		modData.week = new week();
		for (aDate = modData.startDate; aDate < modData.stopDate; aDate = aDate.addDays(1)) {
			modData.week.sheets.push(new sheet(aDate));
		}
	},
	sheetIndex: function (aDate) {
		var i = 0;
		for (i = 0; i < modData.week.sheets.length; i = i + 1) {
			if (modData.week.sheets[i].sheetDate.sameDate(aDate)) { return i; }
		}
		return -1;
	},
	sheet: function (aDate) {
		return modData.week.sheets[modData.sheetIndex(aDate)];
	},
	findProject: function (aDate, aProject) {
		var i = 0, sheet = modData.sheet(aDate);
		for (i = 0; i < sheet.projects.length; i = i + 1) {
			//if (sheet.projects[i].name.toLowerCase() === aProject.toLowerCase()) { return sheet.projects[i]; }
			if (sheet.projects[i].is(aProject)) { return sheet.projects[i]; }
		}
		return null;
	},
	addProject: function (aDate, aProject) {
		var sheet = modData.sheet(aDate);
		sheet.projects.push(new project(aProject));
		return modData.findProject(aDate, aProject);
	},
	addTask: function (task) {
		//??? var sheet = modData.sheet(task.startDate);
		//recurring events date is out of current modData period date range!!!
		if (task.startDate >= modData.startDate && task.startDate <= modData.stopDate) {
			var proj = modData.findProject(task.startDate, task.projectName);
			if (proj === null) {
				proj = modData.addProject(task.startDate, task.projectName);
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
			'scope': gpt.configuration.appScope,
			'cookie_policy': 'de-amicis.com'
			//, immediate: true
			}, aaa); //gpt.presentation.afterAuth);
		return false;
	},
	isConnected: function () {
		return (gapi.auth.getToken() && !gapi.auth.getToken().error);
	},
	disconnect: function () {
	  	//console.log('disconnect');
		if (gpt.security.isConnected()) {
			gapi.auth.setToken(null);
			gapi.auth.signOut();
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
	},
	reset: function() {
		$("#divDATA").html("");
		$("#divDATA").removeClass('d-block').addClass('d-none'); //collapse('hide');
		$("#linkPrevWeek").unbind('click');
		$("#linkNextWeek").unbind('click');
		$("#spanCrtWeek").html("");
		$("#spanAccount").html("calendar@domain.com");
		$("#navbarWeek").collapse('hide');
		$("#btnConnect").removeClass('d-none').addClass('d-block'); //collapse('show');
		$("#btnDisconnect").removeClass('d-block').addClass('d-none'); //collapse('hide');
	},
	afterAuth: function(authResult) {
		if (gpt.security.isConnected()) {
			$("#btnConnect").removeClass('d-block').addClass('d-none'); //collapse('hide');
			$("#btnDisconnect").removeClass('d-none').addClass('d-block'); //collapse('show');
			var url = gpt.configuration.urlCalendarList + "access_token=" + gapi.auth.getToken().access_token;
			$.getJSON(url, function(json) {
				for(var i=0; i<json.items.length; i++) {
					if (json.items[i].primary == true) gpt.data.calendar = json.items[i];
				}
			}).done(function (data) {
				gpt.presentation.showCurrentWeek();
				$("#linkPrevWeek").bind("click", function () {
					gpt.presentation.showPreviousWeek();
				});
				$("#linkNextWeek").bind("click", function () {
					gpt.presentation.showNextWeek();
				});
				$("#navbarWeek").collapse('show');
			});
		} else {
			console.log('auth error !!!');
			gpt.presentation.reset();
		}
	},
	getEvents: function(start, end) {
		var url = gpt.configuration.urlEventList + 
			gpt.data.calendar.id +
			gpt.configuration.urlQuery + 
			"access_token=" + gapi.auth.getToken().access_token;
		url = url + "&timeMin=" + start.getISODateTime() + "&timeMax=" + end.getISODateTime();
		$.getJSON(encodeURI(url), function(json) {
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
			
			//skip full-day events
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
				projectName: crtProject, 
				description: eventTitle, 
				startTime: aStartTime, 
				endTime: aEndTime, 
				hours: aHoursDiff
			});
		}
		gpt.presentation.showWeek(gpt.data.week);
	},
	showWeek: function (week) {
		var t = '<table class="table table-hover table-responsive-sm">' +
			'<thead class="table-default thead-info">' + 
			'<tr class="table-primary">' +
			'<th scope="col" class="font-weight-bold">Project</th>' +
			'<th scope="col" class="font-weight-bold">Tasks</th>' +
			'<th scope="col" class="font-weight-bold">Time</th>' +
			'</tr>' +
			'</thead>' +
			'<tbody>';
		
		for (var i = 0; i < week.sheets.length; i++) {
			var s = week.sheets[i];
			t += '<tr class="table-secondary border-top">' +
			  '<td scope="col">' + s.sheetDate.getMDayName() + '</th>' +
			  '<td scope="col">' + s.sheetDate.getShortDateDDMM() + '</th>' +
			  '<td scope="col" class="text-right">' + s.hours() + ' h' + '</td>' +
			  '</tr>';
			if (s.projects.length > 0) {
				for (var p = 0; p < s.projects.length; p++) {
					t += '<tr>' +
					'<td scope="col">' + s.projects[p].name + '</th>' +
					'<td scope="col">' + s.projects[p].summary() + '= ' + s.projects[p].hours() + ' h' + '</td>' + 
					'<td scope="col" class="text-right">' + s.projects[p].hours() + ' h' + '</td>' +
					'</tr>';
					  }
			}
		}
		t += '<tbody>' +
			'</table>';
		$("#divDATA").html(t);
		$("#divDATA").removeClass('d-none').addClass('d-block'); //collapse('show');
		$("#spanWeek").html("Week&nbsp;" + gpt.presentation.currentDate.getISOWeek() + ",&nbsp;" + week.hours() + " h");
		$("#spanAccount").html(gpt.data.calendar.id);
		$("#spanWeekDetails").html(gpt.data.startDate.getShortDateDDMM() + ' to ' + gpt.data.stopDate.getShortDateDDMM() + '/' + gpt.presentation.currentDate.getISOYear());
	},
	
	showCurrentWeek: function () {
		var firstDate, lastDate;
		if (gpt.presentation.currentDate === undefined) { this.currentDate = new Date(); }
		firstDate = gpt.presentation.currentDate.getFirstDayOfWeek(gpt.presentation.currentDate).clearTime();    
		lastDate = firstDate.addDays(7).clearTime();
		
		$("#spanCrtWeekStart").html(""); //firstDate.getShortDateDDMM());
		$("#spanCrtWeekEnd").html(""); //lastDate.getShortDateDDMM());
		$("#spanCrtWeekHours").html("");
		
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
		//gpt.calendar.doAfterGetEvents = gpt.presentation.calculateWeekTime;
		//gpt.calendar.init();
	}
};

$(document).ready(function() {
	gpt.start();
});

}());