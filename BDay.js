console.log(`Hello`);

//define all our variables
const originalHTML = document.getElementById("bdayCalculation").innerHTML; //Used in the executeAndUpdateWebsite function to refresh the bdayCalculations section after wiping it out from an Error message.
let year; //User entered year
let month; //User entered month
let day; //User entered day
let centuryCode; //Value based on the century of the birthdate
let baseYear; //The Century of the the birthdate
let xxYear; //The last two digits of the birthdate year
let xxYearRemainder; //The remainder when dividing the xxYear by 12
let xxYearSubRemainder; //xxYear-xxYearRemainder
let xxYearQuotient; //The quotient when dividing the xxYear by 12
let xxYearRemDiv4Remainder; //The remainder when dividing the xxYearRemainder value by 4
let xxYearRemDiv4Quotient; //The quotient when dividing the xxYearRemainder value by 4
let monthDoomsday; //Pre-determined doomsday value for a given month
let userDoomsday; //Doomsday value based on user entered month and date.
let totalResult; //The sum of centuryCode, xxYearQuotient, xxYearRemainder, xxYearRemDiv4Quotient, and userDoomsday
let weekDate; //The remainder when dividing the totalResult by 7.
let x; //The quotient when dividing the totalResult by 7
let weekDay; //Final answer outputed by this code. A.K.A - Day of the week the user was born on based on the weekDate

document.getElementById("submitButton").onclick = function(){

    //Pull in the user entered data for year, month, and day once the user clicks the 'submit' button
    year = Number(document.getElementById("birthYear").value);
    month = document.getElementById("birthMonth").value;
    day = Number(document.getElementById("birthDay").value);
    console.log(`The compiled date is the ${day} of ${month}, ${year}.`)

    //Using the century the user was born in we determine our first value in our equation: centuryCode. 
    calcCenturyCode();
    console.log(`The centuryCode is ${centuryCode} for the ${baseYear}'s`);

    //Now we need to determine our next two values in our equation, xxYearQuotient & xxYearRemainder, by taking the last two digits of the year and find the remainder when dividing the value by 12
    xxYear = year - baseYear;
    xxYearRemainder = xxYear % 12;
    xxYearSubRemainder = (xxYear-xxYearRemainder)
    xxYearQuotient = (xxYearSubRemainder/12);
    console.log(`Last 2 digits of ${year} are ${xxYear}`);
    console.log(`After dividing the last two digits of year[${xxYear}] by 12, the quotient is ${xxYearQuotient} and the remainder is ${xxYearRemainder} (${xxYear}/12 = (${xxYearQuotient}*12)+${xxYearRemainder})`);

    //Now we need to find our fourth value for our equation: xxYearRemDiv4Quotient
    xxYearRemDiv4Remainder = xxYearRemainder % 4;
    xxYearRemDiv4Quotient = ((xxYearRemainder-xxYearRemDiv4Remainder)/4);
    console.log(`After dividing the xxYearRemainder by 4, the quotient is ${xxYearRemDiv4Quotient} and the remainder is ${xxYearRemDiv4Remainder} (${xxYearRemainder}/4 = (${xxYearRemDiv4Quotient}*4)+${xxYearRemDiv4Remainder})`);

    //Calculate the fith value for our equation, userDoomsday, by taking into account the user entered day
    doomsdayByMonth(); //This function will determine the doomsdayMonth value based on the user entered month
    userDoomsday = (day-monthDoomsday);
    console.log(`The userDoomsday value is ${userDoomsday} (date entered by user[${day}] - ${month}'s Doomsday[${monthDoomsday}])`,);

    //Now we summate the 5 values to get our totalResult
    totalResult = centuryCode + xxYearQuotient + xxYearRemainder + xxYearRemDiv4Quotient + userDoomsday;
    console.log(`totalResult[${totalResult}] = centuryCode[${centuryCode}] + xxYearQuotient[${xxYearQuotient}] + xxYearRemainder[${xxYearRemainder}] + xxYearRemDiv4Quotient[${xxYearRemDiv4Quotient}] + userDoomsday[${userDoomsday}]`);
    
    //Now we need to calculate the remainder when dividing the totalResult by 7. This value will tell us what day of the week we should output
    weekDate = totalResult%7;
    x = (totalResult-weekDate)/7;
    if (weekDate<0){
        adjustedWeekDate = weekDate+7;
    }
    else{
        adjustedWeekDate = weekDate;
    }
    calcWeekday(); //This function will determine the day of the week based on the value for weekDate
    console.log(`After dividing the totalResult[${totalResult}] by 7 the remainder is ${adjustedWeekDate}. This means that the day of the week for the ${day} of ${month}, ${year} was ${weekDay}`);

    //Output various error messages to the user based on their inputs and update the HTML on the website.
    executeAndUpdateWebsite();
}

function calcCenturyCode(){
    if (year>=1800 && year<=1899){
        centuryCode = 5;
        baseYear = 1800;
    }
    else if(year>=1900 && year<=1999){
        centuryCode = 3;
        baseYear = 1900;
    }
    else if(year>=2000 && year<=2099){
        centuryCode = 2;
        baseYear = 2000;
    }
    else if(year>=2100 && year<=2199){
        centuryCode = 0;
        baseYear = 2100;
    }
    else if(year>=1400 && year<=1499){
        centuryCode = 5;
        baseYear = 1400;
    }
    else if(year>=1500 && year<=1599){
        centuryCode = 3;
        baseYear = 1500;
    }
    else if(year>=1600 && year<=1699){
        centuryCode = 2;
        baseYear = 1600;
    }
    else if(year>=1700 && year<=1799){
        centuryCode = 0;
        baseYear = 1700;
    }
    else{
        console.log("birthYear is not in year range")
    }
}
function doomsdayByMonth(){
    if (month == "January"){
        if (xxYear%4==0){
            monthDoomsday = 4;
        }
        else{
            monthDoomsday = 3;
        }
    }
    else if(month == 'February'){
        if (xxYear%4==0){
            monthDoomsday = 29;
        }
        else{
            monthDoomsday = 28;
        }
    }
    else if (month=='March'){
        monthDoomsday = 14;
    }
    else if (month=='April'){
        monthDoomsday = 4;
    }
    else if (month=='May'){
        monthDoomsday = 9;
    }
    else if (month=='June'){
        monthDoomsday = 6;
    }
    else if (month=='July'){
        monthDoomsday = 11;
    }
    else if (month=='August'){
        monthDoomsday = 8;
    }
    else if (month=='September'){
        monthDoomsday = 5;
    }
    else if (month=='October'){
        monthDoomsday = 10;
    }
    else if (month=='November'){
        monthDoomsday = 7;
    }
    else if (month=='December'){
        monthDoomsday = 12;
    }
    else{
        monthDoomsday = "Error"
        console.log(`monthDoomsday value based on month could not be determined`);
    }
}
function calcWeekday(){
    switch(adjustedWeekDate){
        case 0:
            weekDay = "Sunday";
            break;
        case 1:
            weekDay = "Monday";
            break;
        case 2:
            weekDay = "Tuesday";
            break;
        case 3:
            weekDay = "Wendesday";
            break;
        case 4:
            weekDay = "Thursday";
            break;
        case 5:
            weekDay = "Friday";
            break;
        case 6:
            weekDay = "Saturday";
            break;
        default:
            weekDay = "Error";
            console.log(`Error in weekDay Calculation`)
            break
    }
}
function refreshMyHTML(){
    //Update the content of bdayH2
    document.getElementById('bdayH2').innerHTML = 'You were born on a: ' + weekDay;
    //Update the content of bdayCalculation div
    document.getElementById('bdayCalculation').innerHTML = originalHTML;
}
function executeAndUpdateWebsite(){
    if (day <= 0){
        document.getElementById('bdayH2').textContent = 'Date must be a positive integer. Please try again!';
        document.getElementById('bdayCalculation').innerText = null;
    }
    else if (day >31){
        document.getElementById('bdayH2').textContent = 'Date cannot be greater than 31. Please try again!';
        document.getElementById('bdayCalculation').innerText = null;
    }
    else if (day >30 && (month == "April" || month == "June" || month == "September" || month == "November")){
        document.getElementById('bdayH2').textContent = 'For this month the date cannot be greater than 30. Please try again!';
        document.getElementById('bdayCalculation').innerText = null;
    }
    else if (day > 29 && month == "February"){
        document.getElementById('bdayH2').textContent = 'February only has 29 days on a leap year. Please try using a date between 1-29.';
        document.getElementById('bdayCalculation').innerText = null;
    }
    else if (day > 28 && month == "February" && year%4 !== 0){
        document.getElementById('bdayH2').textContent = 'February only has 28 days on a non-leap year. Please try using a date between 1-28.';
        document.getElementById('bdayCalculation').innerText = null;
    }
    else if (year < 1400){
        document.getElementById('bdayH2').textContent = 'Calculator is not configured to go that far back in the past. Please try again!';
        document.getElementById('bdayCalculation').innerText = null;
    }
    else if (year > 2199){
        document.getElementById('bdayH2').textContent = 'Calculator is not configured to go that far forward into the future. Please try again!';
        document.getElementById('bdayCalculation').innerText = null;
    }
    else if (weekDay == "Error" || monthDoomsday == "Error"){
        document.getElementById('bdayH2').textContent = 'Error in Calculation. Please try again!';
        document.getElementById('bdayCalculation').innerText = null;
    }
    else{
        refreshMyHTML();
        document.getElementById("centuryCode1").textContent = `: [${centuryCode}]`;
        document.getElementById("userYear1").textContent = year;
        document.getElementById("quotient1").textContent = `: [${xxYearQuotient}]`;
        document.getElementById("remainder1").textContent = `: [${xxYearRemainder}]`;
        document.getElementById("userYear2").textContent = year;
        document.getElementById("xxYear1").textContent = xxYear;
        document.getElementById("xxYear2").textContent = xxYear;
        document.getElementById("quotient2").textContent = xxYearQuotient;
        document.getElementById("remainder2").textContent = xxYearRemainder;
        document.getElementById("xxYearRemDiv4Quotient1").textContent = `: [${xxYearRemDiv4Quotient}]`;
        document.getElementById("remainder3").textContent = xxYearRemainder;
        document.getElementById("xxYearRemDiv4Quotient2").textContent = xxYearRemDiv4Quotient;
        document.getElementById("xxYearRemDiv4Remainder").textContent = xxYearRemDiv4Remainder;
        document.getElementById("userDoomsday1").textContent = `: [${userDoomsday}]`;
        document.getElementById("userMonth1").textContent = `(${month})`;
        document.getElementById("userDate1").textContent = `[${day}]`;
        document.getElementById("userMonth2").textContent = `${month}'s`;
        document.getElementById("monthDoomsday").textContent = `[${monthDoomsday}]`;
        document.getElementById("userDoomsday2").innerHTML = '<ins>' + userDoomsday + '</ins>.';
        document.getElementById("totalResult1").textContent = `: [${totalResult}]`;
        document.getElementById("totalResult2").textContent = `[${totalResult}]`;
        document.getElementById("centuryCode2").textContent = `[${centuryCode}]`;
        document.getElementById("quotient3").textContent = `[${xxYearQuotient}]`;
        document.getElementById("remainder4").textContent = `[${xxYearRemainder}]`;
        document.getElementById("xxYearRemDiv4Quotient3").textContent = `[${xxYearRemDiv4Quotient}]`;
        document.getElementById("userDoomsday3").textContent = `[${userDoomsday}]`;
        document.getElementById("weekDate1").textContent = `: [${weekDate}]`;
        document.getElementById("totalResult3").textContent = `[${totalResult}]`;
        document.getElementById("x").textContent = x;
        document.getElementById("weekDate2").textContent = weekDate;
        if (weekDate < 0){
            document.getElementById("negativeNumber").innerHTML = 'For negative remainders, add 7 before moving onto the next step. <Br> e.g., your remainder was ' + weekDate + ' so by adding 7 your new remainder is ' + (adjustedWeekDate);
        }
        else{
            document.getElementById("negativeNumber").innerHTML = '<i><small><span id="negativeNumber"></span></small></i>';
        }
        document.getElementById("weekDay").textContent = `[${adjustedWeekDate} = ${weekDay}]`;
    }
}
