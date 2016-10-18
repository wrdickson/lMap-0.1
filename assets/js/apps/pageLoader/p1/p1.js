define ([
    'common/dispatch',
    'tpl!apps/pageLoader/p1/p1.tpl',
    'backbone'
], function (
    dispatch,
    P1Template,
    Backbone

) {
    
    var p1;
    
    var someModel = Backbone.Model.extend({
        initialize: function (id) {
            var self = this;
            this.set("id", id); 
            this.fetch();
            this.on("change", function () {
                console.log("someModel changed", self);
                self.save();
            });
        },
        urlRoot: "/api/test"
        
    });
    
    p1 = Backbone.View.extend({
        animate: function () {
            var animationName = "animated shake";
            var animationEnd = 'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend';
            $('#aDiv').addClass(animationName).one(animationEnd, function () {
                $(this).removeClass(animationName);
            });

        },
        animate2: function () {
            var message = "Logged is as:<br>someuser";
            var sender = "#btn3";
            dispatch.trigger("app:popupMessage", message, sender);

        },
        changeName: function () {
            //get the value
            var newName = $("#t1").val();
            this.model.set("name", newName);
        },
        events: {
            'click      #btn1'   :  'changeName',
            'click      #btn2'   :  'animate',
            'click      #btn3'   :  'animate2'
            
        },
        initialize: function () {
            var self = this;
            console.log("p1 View initializes");
            dispatch.on("contentMainClear", function () {
                console.log("removing p1 view");
                self.remove();
            });
            self.model = new someModel(4);
            self.model.on("change", function () {
                console.log("view registers model change");
                self.render();
            });
            
            console.log("aModel:", self.model);
        },
        render: function () {
           this.$el.html(P1Template(this.model.toJSON())); 
           return this;            
        }
    });
    
    return p1;

});