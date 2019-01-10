//MODULE PATTERN!! Everything are in IIFIs with the return an object of the methods that we want to expose to the outside world. This keeps data integrity.

//BUDGET CONTROLLER (MODEL)
var budgetController = (function() {
    var data = {
        allItems: {
            exp: [],
            inc: []
        },
        totals: {
            exp: 0, 
            inc: 0
        },
        budget: 0,
        percentage: -1
    };
    var Expense = function(id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
        this.percentage = -1;
    };
    
    Expense.prototype.calcPercentage = function(totalIncome) {
        if (totalIncome > 0) {
            this.percentage = Math.round((this.value / totalIncome) * 100);
        } else {
            this.percentage = -1;
        }
    };

    Expense.prototype.getPercentage = function() {
        return this.percentage;
    };

    var Income = function(id, description, value) {
        this.id = id;
        this.description = description;
        this.value = value;
    };

    var calculateTotal = function(type) {
        var sum = 0;
        data.allItems[type].forEach((current) => {
            sum += current.value;
        });
        data.totals[type] = sum;
    };

    return {
        addItem: function(typ, des, val) {
            var newItem, ID;

            if (data.allItems[typ].length > 0) {
                ID = data.allItems[typ][data.allItems[typ].length - 1].id + 1;
            } else {
                ID = 0;
            }
            
            if (typ === 'exp') {
                newItem = new Expense(ID, des, val);
            } else {
                newItem = new Income(ID, des, val);
            }
            data.allItems[typ].push(newItem);
            return newItem;
        },

        deleteItem: function(type, id) {
            var ids, index;
            ids = data.allItems[type].map(function(current) {
                return current.id;
            });
            index = ids.indexOf(id);
            if (index !== -1) {
                data.allItems[type].splice(index, 1);
            }
        },

        calculateBudget: function() {
            calculateTotal('exp');
            calculateTotal('inc');
            data.budget = data.totals.inc - data.totals.exp;
            if (data.totals.inc > 0) {
                data.percentage = Math.round((data.totals.exp / data.totals.inc) * 100);
            } else {
                data.percentage = -1;
            }
        }, 

        calculatePercentages: function() {
            data.allItems.exp.forEach(function(current) {
                current.calcPercentage(data.totals.inc);
            });
        },

        getPercentages: function() {
            var allPercentages = data.allItems.exp.map(function(current) {
                return current.getPercentage();
            });
            return allPercentages;
        },

        getBudget: function() {
            return {
                budget : data.budget,
                totalInc : data.totals.inc,
                totalExp : data.totals.exp,
                percentage : data.percentage
            }
        },

        testing: function() {
            console.log(data);
        }
    };
})();


//CONTROLLER
var mainController = (function(model, view) {
    var setupEventListeners = function() {
        var domStrings = uiController.getDomStrings();

        document.querySelector(domStrings.inputButton).addEventListener("click", mainAddItem);

        document.addEventListener('keypress', function(event) {
            if (event.keyCode === 13 || event.which === 13 ) {
                mainAddItem();
            }
        });

        document.querySelector(domStrings.container).addEventListener("click", ctrlDeleteItem);
        document.querySelector(domStrings.inputType).addEventListener("change", uiController.changedType);
    }

    var updateBudget = function () {
        var budgetData;
        // Calculate the budget
        budgetController.calculateBudget();
        //Update the UI
        budgetData = budgetController.getBudget();
        uiController.updateBudgetUi(budgetData);
    };

    var updatePercentages = function () {
        //Calculate the percentages
        budgetController.calculatePercentages();
        //Read Percentages from model
        var percentages = budgetController.getPercentages();
        //Update UI with new percentages
        uiController.displayPercentages(percentages);
    }

    var mainAddItem = function () {
        var userInputs, addedItem
        //Get the filled input data
        userInputs = uiController.getInput();
        
        if (userInputs.description !== "" && !isNaN(userInputs.value) && userInputs.value > 0) {
            //Add the item to the budgetController
            addedItem = budgetController.addItem(userInputs.type, userInputs.description, userInputs.value);
            //Add the item to the UI
            uiController.addListItem(addedItem, userInputs.type);
            //Calculate and update budget
            updateBudget();
            uiController.clearFields();
            //Update percentages
            updatePercentages();

        }
    }

    var ctrlDeleteItem = function (event) {
        var itemId, splitId, type, id;
        itemId = event.target.parentNode.parentNode.parentNode.parentNode.id;
        
        if (itemId) {
            splitId = itemId.split('-');
            type = splitId[0];
            id = parseInt(splitId[1]);
        
            //Delete item from Model
            budgetController.deleteItem(type, id);
            //Deltee item from UI
            uiController.deleteListItem(itemId);
            //Update the budget
            updateBudget();
            //Update Percentages
            updatePercentages();
        }
    };

    return {
        init : function() {
            console.log("Application has started");
            uiController.displayMonth();
            uiController.updateBudgetUi({
                budget : 0,
                totalInc : 0,
                totalExp : 0,
                percentage : -1
            });
            setupEventListeners();
        },
        
    };
})(budgetController, uiController);



//UI CONTORLLER (VIEW)
var uiController = (function() {
    //Code for the UI layer
    var domStrings ={
        inputType: '.add__type',
        inputDescription: '.add__description',
        inputValue : '.add__value',
        inputButton: '.add__btn',
        incomeContainer: '.income__list',
        expenseContainer: '.expenses__list',
        totalIncome: '.budget__income--value',
        totalExpense: '.budget__expenses--value',
        totalBudget: '.budget__value',
        budgetPercentage: '.budget__expenses--percentage',
        container: '.container',
        expensesPercLabel: '.item__percentage',
        dateLabel: '.budget__title--month'
    };

    var formatNumber = function(num, type) {
        var numSplit, int, dec, sign;
        num = Math.abs(num);
        num = num.toFixed(2);

        numSplit = num.split('.');
        int = numSplit[0];
        dec = numSplit[1];
        if (int.length > 3) {
            int = int.substr(0,int.length - 3) + ',' + int.substr(int.length - 3, int.length);
        }
        type === 'exp' ? sign = '-' : sign = '+';
        return sign + '' + int + '.' + dec;
    };


    return {
        getInput: function () {
            return {
                type : document.querySelector(domStrings.inputType).value,
                description : document.querySelector(domStrings.inputDescription).value,
                value : parseFloat(document.querySelector(domStrings.inputValue).value)
            }
        },

        addListItem: function(obj, type) {
            var html, newHtml, element;

            // Create HTML string with placeholder text
            if (type === 'inc') {
                element = domStrings.incomeContainer;
                html = '<div class="item clearfix" id="inc-%id%"> <div class="item__description">%description%</div><div class="right clearfix"><div class="item__value"> %value%</div><div class="item__delete"><button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button></div></div></div>';
            } else {
                element = domStrings.expenseContainer;
                html = '<div class="item clearfix" id="exp-%id%"><div class="item__description">%description%</div><div class="right clearfix"><div class="item__value"> %value%</div><div class="item__percentage">21%</div><div class="item__delete"><button class="item__delete--btn"><i class="ion-ios-close-outline"></i></button></div></div></div>';
            }
            
            // Replace placeholder text with actual data
            newHtml = html.replace('%id%', obj.id);
            newHtml = newHtml.replace('%description%', obj.description);
            newHtml = newHtml.replace('%value%', formatNumber(obj.value, type));

            // Insert the html into the DOM
            document.querySelector(element).insertAdjacentHTML('beforeend', newHtml);
        }, 

        deleteListItem: function(selectorId) {
            var element;
            element = document.getElementById(selectorId)
            element.parentNode.removeChild(element);
        },

        updateBudgetUi: function(budgetData) {
            var type;
            budgetData.budget > 0 ? type = 'inc' : type = 'exp';
            document.querySelector(domStrings.totalIncome).textContent = formatNumber(budgetData.totalInc, type);
            document.querySelector(domStrings.totalExpense).textContent = formatNumber(budgetData.totalExp, type);
            document.querySelector(domStrings.totalBudget).textContent = formatNumber(budgetData.budget, type);
            if (budgetData.percentage > 0) {
                document.querySelector(domStrings.budgetPercentage).textContent = budgetData.percentage + '%';
            } else {
                document.querySelector(domStrings.budgetPercentage).textContent = '---'
            }
            
        }, 

        displayPercentages: function(percentages) {
            var fields = document.querySelectorAll(domStrings.expensesPercLabel);

            var nodeListForEach = function(list, callback) {
                for (var i = 0; i < list.length; i++) {
                    callback(list[i], i);
                }
            };

            nodeListForEach(fields, function(current, index) {
                if (percentages[index] > 0) {
                    current.textContent = percentages[index] + '%';
                } else {
                    current.textContent = '---';
                }
            });
        },

        displayMonth: function() {
            var now, year, month, months;
            months = ['Jaunary', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            now = new Date();
            year = now.getFullYear();
            month = now.getMonth();
            document.querySelector(domStrings.dateLabel).textContent = months[month] + ' ' + year;
        },

        clearFields: function() {
            var fields, fieldsArray;
            fields = document.querySelectorAll(domStrings.inputDescription + ',' + domStrings.inputValue + ',' + domStrings.totalIncome + ',' + domStrings.totalExpense + ',' + domStrings.totalBudget + ',' + domStrings.budgetPercentage);

            fieldsArray = Array.prototype.slice.call(fields);
            //The three fields automatically in the anonymous function
            fieldsArray.forEach((current, index, array) => {
                current.value = "";
            });
            fieldsArray[4].focus();

        },

        changedType: function() {
            var fields, fieldsArray;
            fields = document.querySelectorAll(domStrings.inputType + ',' + domStrings.inputDescription + ',' + domStrings.inputValue);
            fieldsArray = Array.prototype.slice.call(fields);

            fieldsArray.forEach((current) => {
                current.classList.toggle('red-focus');
            });

            document.querySelector(domStrings.inputButton).classList.toggle('red');
        },
        
        getDomStrings : function () {
            return domStrings;
        }
    };
})();

//The only line of code outsde the IIFIs that takes care of the event listeners
mainController.init();