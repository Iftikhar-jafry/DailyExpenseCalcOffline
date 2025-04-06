// getID is function which return document.getElementById()
const btn=getID("addEx");
var ol;
const divTSubtrat=getID("rem");
const totalMoneyEl = getID("totalMoney");
const remEl = getID("rem");
const exNameEl = getID("exName");
const exValueEl = getID("Ex");
const part3El = getID("part3");
const perDayEl = getID("perDay");
const passwordEl = getID("password");
const totalMoneyInputEl = getID("TOTALMONEY");
const containerEl = getID("container");
const secContainerEl = getID("secContainer");


var count=1;
var total=0;
var passCount=0;

function setExpense()
{
    if(count===1)
    {
        var div1=ToCreateElement("div")
        var head=ToCreateElement("h1");
        ol=ToCreateElement('ol');
        var date=new Date();       
        head.innerHTML=date.toLocaleDateString('eng',{day:'numeric',weekday:'long',year:'numeric',month:'long'});    
        // head.innerHTML="Sunday, April 28, 2024";
        part3El.appendChild(div1);
        div1.appendChild(head);
        div1.appendChild(ol);
        count=2;
    }
        total+=parseInt(exValueEl.value);
        let li=ToCreateElement('li');
        let span1=ToCreateElement('span');
        span1.innerHTML=exNameEl.value;
        let span2=ToCreateElement('span');
        span2.innerHTML=exValueEl.value;
        ol.appendChild(li);
        li.appendChild(span1);
        li.appendChild(span2);
        exNameEl.value="";
        exValueEl.value="";
}

function totalExpense()
{
    let divT=ToCreateElement("div");
    divT.style.background="#fef";
    const perDayValue = parseInt(perDayEl.innerHTML) || 0;
    const goodBad = perDayValue - total;
    const status = goodBad > 0 ? `<font color='green'>Good ${goodBad}</font>` :
                  goodBad < 0 ? `<font color='red'>Bad ${goodBad}</font>` : "Ok";


    divT.innerHTML=`Total Expense in a Day : ${total}. . . . . . Per Day is : ${perDayEl.innerHTML}. . . ${status}`;

    part3El.appendChild(divT);
    divTSubtrat.innerHTML=parseInt(ToGetStorage("remain"))-total;
    ToSetStorage("remain",divTSubtrat.innerHTML);
    rem.innerHTML=ToGetStorage("remain");
    ToSetStorage("datas",part3El.innerHTML);
    console.log(ToSetStorage("datas",part3El.innerHTML))
    show()
    count=1
    total=0
    perDay();
}

function perDay()
{
    let date=new Date();
    let lastDate=new Date(date.getFullYear(),date.getMonth()+1,0).getDate();
    let numberOfDays=lastDate-date.getDate();
         
    ToSetStorage("numDay",parseInt(numberOfDays));
    perDayEl.innerHTML=parseInt(parseInt(ToGetStorage("remain"))/parseInt(ToGetStorage("numDay")));
}

function showTotalButton()
{
    ToShowElement("total");
}


function show()
{
    part3El.innerHTML=ToGetStorage("datas");
    totalMoneyEl.innerHTML=ToGetStorage("TotalMoney")
    remEl.innerHTML=ToGetStorage("remain");
    ToHideElement("total")
    perDayEl.innerHTML=parseInt(parseInt(ToGetStorage("remain"))/parseInt(ToGetStorage("numDay")));

}
show();

function reset()
{
    let pass=passwordEl.value
    if(pass=="Noor112%")
    {
        let t=totalMoneyInputEl.value
        if(passCount>=2)
        {
            getID("passLabel").innerHTML="";
            getID("TOTALMONEY").value="";
            cancel();
        }
        else if(t=="")
        {
            getID("passLabel").innerHTML="";
            getID("totalLabel").innerHTML="<font color='red'> !Please Enter valid Amount. Now You have chance </font>"
            passwordEl.value=""
            getID("TOTALMONEY").value=""
            passCount++;
        }
        else
        {
            var TotalMoney=ToCreateElement("span");
            TotalMoney.innerHTML=t;
            ToSetStorage("TotalMoney",TotalMoney.innerHTML);

            divTSubtrat.innerHTML=t
            ToSetStorage("remain",divTSubtrat.innerHTML);

            part3El.innerHTML=""
            ToSetStorage("datas",part3El.innerHTML);
            document.getElementById("passLabel").innerHTML="";
            passwordEl.value=""
            totalMoneyInputEl.value=""
            show();
            perDay();
            cancel();
        }
    } 
    else if(passCount<2)
    {
        passCount++
        getID("passLabel").innerHTML="<font color='red'> !You Enter Wrong Password. Now You have "+(3-passCount)+" chance </font>";
        getID("totalLabel").innerHTML=""
        passwordEl.value=""
        getID("TOTALMONEY").value=""
    }
    else
    {
        getID("passLabel").innerHTML="";
        passwordEl.value=""
        totalMoneyInputEl.value=""
        cancel()
    }
}
function change()
{
    ToHideElement("container")
    ToShowElement("secContainer");
}
function cancel()
{
    passCount=0
    ToHideElement("secContainer")
    ToShowElement("container");
}
ToHideElement("secContainer")

// function for print expenses
function PrintElem()
{
    var mywindow = window.open('', 'PRINT', 'height=auto,width=600');

    mywindow.document.write('<html><head><style>body{font-family: Times, serif; background: skyblue;background-repeat: no-repeat;background-size: cover;}');
    mywindow.document.write('#part3{width: 97%;margin: auto;}#part3 div{margin-bottom: 10px;padding: 10px;width: 90%;background-color: aqua;background: rgba(53, 245, 245 , 0.3);border-radius: 10px;border: 1px dashed rgb(48, 121, 121);margin-bottom: 15px;}');
    mywindow.document.write('#part3 div h1{text-align: center;font-size: 30px;font-weight: 600;font-style: oblique;border-bottom: 3px solid burlywood;}');
    mywindow.document.write('ol{width: 90%;}ol li{padding: 5px;width: 90%;display: flex;justify-content: space-between;}');
    mywindow.document.write('ol li span{width: 47%;font-size: 19px;font-weight: 800;border-left: 1px dashed red;border-bottom: 1px solid red;}</style>');
    mywindow.document.write('<title> + "Monthy Expenses "  + </title>');
    mywindow.document.write('</head><body >');
    mywindow.document.write('<h1 style="color:red;">' + "Monthy Expenses"  + '</h1>');
    mywindow.document.write(part3El.innerHTML);
    mywindow.document.write('</body></html>');

    mywindow.document.close(); // necessary for IE >= 10
    mywindow.focus(); // necessary for IE >= 10*/

    mywindow.print();
    mywindow.close();

    return true;
}

function ToShowElement(id)
{
    getID(id).style.display="block";
}
function ToHideElement(id)
{
    getID(id).style.display="none";
}

function ToSetStorage(name , id)
{
    localStorage.setItem(name,id);
}

function ToGetStorage(name)
{
    return localStorage.getItem(name);
}

function ToCreateElement(name)
{
    return document.createElement(name)
}

function getID(id)
{
    return document.getElementById(id);
}