Date.prototype.getMDayName = function() {
    return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][this.getMDay()];
}
Date.prototype.getMDay = function() {
    return (this.getDay() + 6) %7;
}
Date.prototype.getISOYear = function() {
    var thu = new Date(this.getFullYear(), this.getMonth(), this.getDate()+3-this.getMDay());
    return thu.getFullYear();
}
Date.prototype.getISOWeek = function() {
    var onejan = new Date(this.getISOYear(),0,1);
    var wk = Math.ceil((((this - onejan) / 86400000) + onejan.getMDay()+1)/7);
    if (onejan.getMDay() > 3) wk--;
    return wk;
}

Date.prototype.getMonth0 = function() {
    var m = (this.getMonth()+1 < 10) ? "0" : "";
    m += this.getMonth()+1;
    return m;
}
Date.prototype.getDate0 = function() {
    var m = (this.getDate() < 10) ? "0" : "";
    m += this.getDate();
    return m;
}
Date.prototype.getHours0 = function() {
    var m = (this.getHours() < 10) ? "0" : "";
    m += this.getHours();
    return m;
}
Date.prototype.getMinutes0 = function() {
    var m = (this.getMinutes() < 10) ? "0" : "";
    m += this.getMinutes();
    return m;
}
Date.prototype.getSeconds0 = function() {
    var m = (this.getSeconds() < 10) ? "0" : "";
    m += this.getSeconds();
    return m;
}

Date.prototype.getISODate = function() {
    return this.getFullYear() + "-" + this.getMonth0() + "-" + this.getDate0();
}
Date.prototype.getISOTime = function() {
    return this.getHours0() + ":" + this.getMinutes0() + ":" + this.getSeconds0();
}
Date.prototype.getISODateTime = function() {
    return this.getISODate() + "T" + this.getISOTime() + ".000Z";
}
Date.prototype.getShortDateDDMM = function() {
    return this.getDate0() + "/" + this.getMonth0();
}
Date.prototype.toTime = function() {
    return this.getHours0() + ":" + this.getMinutes0();
}
Date.prototype.getFirstDayOfWeek = function(currentDate) {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - currentDate.getMDay());
}
Date.prototype.addDays = function(days) {
  var newDate = new Date(this.getFullYear(), this.getMonth(), this.getDate());
  newDate.setDate(newDate.getDate()+days);
  return newDate;
}
Date.prototype.hoursDiff = function(fromDate) {
  return (this.getTime() - fromDate.getTime()) / 1000 / 60 / 60;
}
Date.prototype.clearTime = function() {
  this.setHours(0);
  this.setMinutes(0);
  this.setSeconds(0);
  this.setMilliseconds(0);
  return this;
}
Date.prototype.sameDate = function(anotherDate) {
  var aFirstDate = this.clearTime();
  var aSecondDate = anotherDate.clearTime();
  return (aFirstDate.getISODate() == aSecondDate.getISODate());
}