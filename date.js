function getTwoDigit(number) {
  numstr = number.toString();
  if (numstr.length < 2) {
    numstr = "0" + numstr;
  }
  return numstr;
}

function getTimezoneRegion(offset) {
  switch (offset) {
    case 7:
      return "WIB";
    case 8:
      return "WITA";
    case 9:
      return "WIT";
    default:
      let offsetDecimal = parseFloat("." + offset.toString().split(".")[1]);
      let offsetMins = "00";
      if (offsetDecimal) {
        offsetMins = getTwoDigit(parseFloat((offsetDecimal / 1) * 60));
      }
      if (offset >= 0) {
        offsetHour = Math.floor(offset).toString();
        return "(UTC+" + offsetHour + ":" + offsetMins + ")";
      } else {
        offsetHour = Math.ceil(offset).toString();
        return "(UTC" + offsetHour + ":" + offsetMins + ")";
      }
  }
}

function getLocalTime(strTimeUTC) {
  // Format "YYYY-MM-DD HH:MM:SS.000"
  let time = strTimeUTC.split(" ")[1].split(".")[0];
  let date = strTimeUTC.split(" ")[0];
  let properUTC = new Date(`${date}T${time}+00:00`);
  let offset = properUTC.getTimezoneOffset() / -60;
  let localTime =
    getTwoDigit(properUTC.getHours()) +
    ":" +
    getTwoDigit(properUTC.getMinutes()) +
    ":" +
    getTwoDigit(properUTC.getSeconds());
  localTime += " " + getTimezoneRegion(offset);

  let localDate =
    properUTC.getFullYear() +
    "-" +
    getTwoDigit(properUTC.getMonth() + 1) +
    "-" +
    getTwoDigit(properUTC.getDate());

  return `${localDate} ${localTime}`;
}
