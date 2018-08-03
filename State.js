'use strict';
define([
        'dojo/_base/declare',
        'underscore'
    ],
    function(declare, _) {

        var State = declare(null, {
            constructor: function(data) {
                this.savedState = _.defaults({}, data, {
                    region: 'Global',
                    scaleLock: false,
                    stat: 'reef_value',
                });
            },

            getState: function() {
                return this.savedState;
            },


            getRegion: function() {
                return this.savedState.region;
            },

            setRegion: function(region) {
                return this.clone({
                    region: region
                });
            },

            getScaleLock: function() {
                return this.savedState.scaleLock;
            },

            setScaleLock: function(checked) {
                return this.clone({
                    scaleLock: checked
                });
            },

            getStat: function() {
                return this.savedState.stat;
            },

            setStat: function(stat) {
                return this.clone({
                    stat: stat,
                });
            },

            // Return new State combined with `data`.
            clone: function(data) {
                return new State(_.assign({}, this.getState(), data));
            }
        });

        return State;
    }
);
