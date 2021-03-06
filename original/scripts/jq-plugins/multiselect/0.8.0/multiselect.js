﻿/**
 * 左右互选组件
 *
 * Created by jinzk on 2015/10/28.
 *
 * options = {
 *      //高度，默认为"auto"
 *      height,
 *      //最小高度，默认为300(px)
 *      minHeight,
 *      //最大高度，默认为400(px)
 *      maxHeight,
 *      //已选栏配置
 *      toColumn: {
 *          // 自定义标题
 *          title: "已选栏",
 *          // 自定义样式class
 *          cssClass: "col-sm-6",
 *          // 已选列表，每项可为string或object，object必须含有name字段属性
 *          items: [],
 *          // "加载更多"功能，function。若返回 Deferred 或 Promise 对象，将自动处理相关状态并添加数据
 *          loadMore: null
 *      },
 *      //未选栏配置
 *      fromColumn: {
 *          // 自定义标题
 *          title: "可选栏",
 *          // 自定义样式class
 *          cssClass: "col-sm-6",
 *          // 已选列表，每项可为string或object，object必须含有name字段属性
 *          items: [],
 *          // "加载更多"功能，function。若返回 Deferred 或 Promise 对象，将自动处理相关状态并添加数据
 *          loadMore: null
 *      },
 *      // 使用 getSelectedData 和 getUnSelectedData 方法获取数据时指定数据源的键值，仅在数据项是对象类型时有效
 *      dataSrc: "",
 *      // 创建完成后的回调函数
 *      oncreated: null,
 *      // 选择改变后的回调函数
 *      onchanged: null,
 *      // 选择后的回调函数
 *      onselected: null,
 *      // 取消选择后的回调函数
 *      ondeselected: null
 * }
 *
 * Examples:
 * -- 初始构建
 * $(example).multiSelect({
 *      toColumn: {
 *          items: [
 *              "item1"
 *          ]
 *      },
 *      fromColumn: {
 *          items: [
 *              "item0",
 *              {
 *                  name: "item2",
 *                  // 不显示图标
 *                  icon: false
 *              }
 *          ]
 *      }
 * });
 *
 * -- 设置高度
 * $(example).multiSelect('setHeight', height);
 *
 * -- 设置最小高度
 * $(example).multiSelect('setMinHeight', minHeight);
 *
 * -- 设置最大高度
 * $(example).multiSelect('setMaxHeight', maxHeight);
 *
 * ---- loadMore 相关功能----
 *
 * -- 调用 fromColumn 配置项对应的loadMore方法（若存在）
 * $(example).multiSelect('loadMoreFrom');
 *
 * -- 改变 fromColumn 下 loadMore 功能的状态为"加载中"（配置loadMore时有效）
 * $(example).multiSelect('loadingMoreFrom');
 *
 * -- 改变 fromColumn 下 loadMore 功能的状态为"加载完毕"，需传入当次加载项数目参数（配置loadMore时有效）
 * $(example).multiSelect('loadedMoreFrom');
 *
 * -- 改变 fromColumn 下 loadMore 功能的状态为"加载错误"（配置loadMore时有效）
 * $(example).multiSelect('errorMoreFrom');
 *
 * -- 改变 fromColumn 下 loadMore 功能的状态为"加载全部完成"（配置loadMore时有效）
 * $(example).multiSelect('doneMoreFrom');
 *
 * ----以上 loadMore 相关功能 toColumn下用法和 fromColumn用法类似，只不过需要将 "From" 改为 "To"----
 *
 * -- 添加已选区域项
 * $(example).multiSelect('addSelectedItems', [items]);
 *
 * -- 添加未选区域项
 * $(example).multiSelect('addUnSelectedItems', [items]);
 *
 * -- 重设已选区域项
 * $(example).multiSelect('setSelectedItems', [items]);
 *
 * -- 重设未选区域项
 * $(example).multiSelect('setUnSelectedItems', [items]);
 *
 * -- 判断是否已改变选择
 * var isChanged = $(example).multiSelect('isChanged');
 *
 * -- 获取已选数据
 * var data = $(example).multiSelect('getSelectedData');
 *
 * -- 获取未选数据
 * var data = $(example).multiSelect('getUnSelectedData');
 */
define(['jquery'], function($) {

    var isNumeric = function(o) {
        return typeof(o) === "number" || /^\d+(\.\d+)?$/.test(o);
    };

    var MultiSelect = function(element, options) {
        this.$element = $(element);

        options = options && typeof options === "object" ? options : {};

        this.options = $.extend({}, MultiSelect.DEFAULTS, options);
        this.options.toColumn = $.extend({}, MultiSelect.DEFAULTS.toColumn, options.toColumn);
        this.options.fromColumn = $.extend({}, MultiSelect.DEFAULTS.fromColumn, options.fromColumn);

        this.bindEvents();

        this.create();
        this.handleEvents();
    };

    MultiSelect.VERSION = "0.8.0";

    MultiSelect.DATA_KEY = "item.multiselect";
    MultiSelect.INST_KEY = "ui.multiselect";

    MultiSelect.TYPE_SELECTED = "selected";
    MultiSelect.TYPE_UNSELECTED = "unselected";

    MultiSelect.DEFAULTS = {
        height: "auto",
        minHeight: 300,
        maxHeight: 400,
        toColumn: {
            title: "已选栏",
            cssClass: "col-sm-6",
            items: [],
            loadMore: null
        },
        fromColumn: {
            title: "可选栏",
            cssClass: "col-sm-6",
            items: [],
            loadMore: null
        },
        dataSrc: null,
        oncreated: null,
        onchanged: null,
        onselected: null,
        ondeselected: null
    };

    MultiSelect.DEFAULTS.ITEM = {
        name: "",
        icon: true
    };

    MultiSelect.ITEM = function(item) {
        var self = this;
        if (typeof item === "string") {
            this.originalData = item;
            $.each(MultiSelect.DEFAULTS.ITEM, function(key, value) {
                if (key == "name") {
                    self[key] = item;
                } else {
                    self[key] = value;
                }
            });
        } else {
            this.originalData = item ? $.extend({}, item) : item;
            item = $.extend({}, MultiSelect.DEFAULTS.ITEM, item);
            $.each(item, function(key, value) {
                self[key] = value;
            });
        }
    };

    MultiSelect.prototype.bindEvents = function() {
        this.$element.off('created.multiselect').on('created.multiselect', $.proxy(function(e) {
            if (!this.options.fromColumn.items || this.options.fromColumn.items.length <= 0) {
                var html = '<div class="alert alert-info" style="margin: 0 5px;">无可添加项</div>';
                $('.multiselect-column-list', $('.multiselect-column-from', $(e.currentTarget))).append(html);
            }
            if (typeof this.options.oncreated === "function") {
                this.options.oncreated.apply(this, arguments);
            }
        }, this));
        this.$element.off('changed.multiselect').on('changed.multiselect', $.proxy(function(e) {
            if (typeof this.options.onchanged === "function") {
                e.data = $(e.relatedTarget).data(MultiSelect.DATA_KEY).originalData;
                this.options.onchanged.apply(this, arguments);
            }
        }, this));
        this.$element.off('selected.multiselect').on('selected.multiselect', $.proxy(function(e) {
            if (typeof this.options.onselected === "function") {
                e.data = $(e.relatedTarget).data(MultiSelect.DATA_KEY).originalData;
                this.options.onselected.apply(this, arguments);
            }
        }, this));
        this.$element.off('deselected.multiselect').on('deselected.multiselect', $.proxy(function(e) {
            var $alert = $('.multiselect-column-list', $('.multiselect-column-from', $(e.currentTarget))).find('.alert');
            if ($alert.length) {
                $alert.remove();
            }
            if (typeof this.options.ondeselected === "function") {
                e.data = $(e.relatedTarget).data(MultiSelect.DATA_KEY).originalData;
                this.options.ondeselected.apply(this, arguments);
            }
        }, this));

        return this;
    };

    MultiSelect.prototype.create = function() {
        var self = this, options = this.options;

        var $toColumn = $(
            '<fieldset class="multiselect-column-to">' +
                '<legend class="multiselect-column-title">'+options.toColumn.title+'</legend>' +
                '<div class="multiselect-column-filter">'+
                    '<i class="multiselect-icon-search"></i>' +
                    '<input class="form-control" type="search" />' +
                '</div>' +
                '<ul class="multiselect-column-list"></ul>' +
            '</fieldset>'
        ), $fromColumn = $(
            '<fieldset class="multiselect-column-from">' +
                '<legend class="multiselect-column-title">'+options.fromColumn.title+'</legend>' +
                '<div class="multiselect-column-filter">'+
                    '<i class="multiselect-icon-search"></i>' +
                    '<input class="form-control" type="search" />' +
                '</div>' +
                '<ul class="multiselect-column-list"></ul>' +
            '</fieldset>'
        );

        // init to list
        $toColumn.addClass(options.toColumn.cssClass);
        var $toList = $(".multiselect-column-list", $toColumn),
            $toItems = this.createItems(options.toColumn.items, MultiSelect.TYPE_SELECTED);
        $toList.append($toItems);

        // init from list
        $fromColumn.addClass(options.fromColumn.cssClass);
        var $fromList = $(".multiselect-column-list", $fromColumn),
            $fromItems = this.createItems(options.fromColumn.items, MultiSelect.TYPE_UNSELECTED);
        $fromList.append($fromItems);

        this.$element.empty().append($fromColumn).append($toColumn);

        this.$toColumn = $(".multiselect-column-to", this.$element);
        this.$toList = $(".multiselect-column-list", this.$toColumn);

        this.createMoreItem(MultiSelect.TYPE_SELECTED);

        this.$fromColumn = $(".multiselect-column-from", this.$element);
        this.$fromList = $(".multiselect-column-list", this.$fromColumn);

        this.createMoreItem(MultiSelect.TYPE_UNSELECTED);

        this.orgSelectedItems = this.getSelectedItems();

        if (options.height && options.height !== "auto") {
            this.setHeight();
        } else {
            this.setMinHeight();
            this.setMaxHeight();
        }

        this.$element.trigger($.Event("created.multiselect"));

        return this;
    };

    MultiSelect.prototype.createItem = function(item, type) {
        if (item && item.name) {
            var itemTile, icon, iconTile;
            if (type === MultiSelect.TYPE_SELECTED) {
                icon = "delete";
                iconTile = "移除";
                itemTile = "双击移除";
            } else {
                icon = "add";
                iconTile = "选择";
                itemTile = "双击选择";
            }
            return $(
                '<li class="multiselect-column-item">' +
                    (item.icon ? '<i class="multiselect-icon-' + icon + '" title="' + iconTile + '"></i>' : '') +
                    '<a title="' + itemTile + '">' + item.name + '</a>' +
                '</li>'
            ).data(MultiSelect.DATA_KEY, item);
        }
        return $([]);
    };

    MultiSelect.prototype.createItems = function(items, type) {
        items = items || [];
        var self = this, $items = $([]);
        $.each(items, function(i, item) {
            $items = $items.add(self.createItem(new MultiSelect.ITEM(item), type));
        });
        return $items;
    };

    MultiSelect.prototype.createMoreItem = function(type) {
        if (type === MultiSelect.TYPE_SELECTED && this.options.toColumn.loadMore) {
            if (this.$toList.children(".multiselect-column-more").length <= 0) {
                this.$toList.append('<li class="multiselect-column-more"><a href="javascript:;">加载更多</a></li>');
            }
        } else if(type === MultiSelect.TYPE_UNSELECTED && this.options.fromColumn.loadMore) {
            if (this.$fromList.children(".multiselect-column-more").length <= 0) {
                this.$fromList.append('<li class="multiselect-column-more"><a href="javascript:;">加载更多</a></li>');
            }
        }

        return this;
    };

    MultiSelect.prototype.handleEvents = function() {
        var self = this;
        // search to
        this.$toColumn.find('input[type="search"]').on("keypress.multiselect", function(e) {
            if (e.keyCode == 13) {
                self.searchTo();
            }
        });
        this.$toColumn.find('.multiselect-icon-search').on("click.multiselect", function() {
            self.searchTo();
        });
        // search from
        this.$fromColumn.find('input[type="search"]').on("keypress.multiselect", function(e) {
            if (e.keyCode == 13) {
                self.searchFrom();
            }
        });
        this.$fromColumn.find('.multiselect-icon-search').on("click.multiselect", function() {
            self.searchFrom();
        });
        // move events
        var doAddItem = function($item) {
            var $newItem = self.createItem($item.data(MultiSelect.DATA_KEY), MultiSelect.TYPE_SELECTED);
            self.$toList.prepend($newItem);
            $item.remove();
            self.$element.trigger($.Event("selected.multiselect", {relatedTarget: $newItem[0]}));
            if (self.isChanged()) {
                self.$element.trigger($.Event("changed.multiselect", {relatedTarget: $newItem[0]}));
            }
        };
        var doDeleteItem = function($item) {
            var $newItem = self.createItem($item.data(MultiSelect.DATA_KEY), MultiSelect.TYPE_UNSELECTED);
            self.$fromList.prepend($newItem);
            $item.remove();
            self.$element.trigger($.Event("deselected.multiselect", {relatedTarget: $newItem[0]}));
            if (self.isChanged()) {
                self.$element.trigger($.Event("changed.multiselect", {relatedTarget: $newItem[0]}));
            }
        };
        // deselect
        this.$toList.on("dblclick.multiselect", ".multiselect-column-item>a", function() {
            doDeleteItem($(this).parents("li:first"));
        });
        this.$toList.on("click.multiselect", ".multiselect-icon-delete", function() {
            doDeleteItem($(this).parents("li:first"));
        });
        // select
        this.$fromList.on("dblclick.multiselect", ".multiselect-column-item>a", function() {
            doAddItem($(this).parents("li:first"));
        });
        this.$fromList.on("click.multiselect", ".multiselect-icon-add", function() {
            doAddItem($(this).parents("li:first"));
        });
        // load more
        this.$toList.on("click.multiselect", ".multiselect-column-more>a", this, function(e) {
            if ($(this).parent().hasClass("done") || $(this).parent().hasClass("loading")) return false;
            e.data.loadMoreTo();
        });
        this.$fromList.on("click.multiselect", ".multiselect-column-more>a", this, function(e) {
            if ($(this).parent().hasClass("done") || $(this).parent().hasClass("loading")) return false;
            e.data.loadMoreFrom();
        });

        return this;
    };

    MultiSelect.prototype.setHeight = function(height) {
        if (typeof height === "undefined") {
            height = this.options.height;
        }
        this.$toList.css('height', height + (isNumeric(height) ? "px" : ""));
        this.$fromList.css('height', height + (isNumeric(height) ? "px" : ""));

        return this;
    };

    MultiSelect.prototype.setMinHeight = function(minHeight) {
        if (typeof minHeight === "undefined") {
            minHeight = this.options.minHeight;
        }
        this.$toList.css('minHeight', minHeight + (isNumeric(minHeight) ? "px" : ""));
        this.$fromList.css('minHeight', minHeight + (isNumeric(minHeight) ? "px" : ""));

        return this;
    };

    MultiSelect.prototype.setMaxHeight = function(maxHeight) {
        if (typeof maxHeight === "undefined") {
            maxHeight = this.options.maxHeight;
        }
        this.$toList.css('maxHeight', maxHeight + (isNumeric(maxHeight) ? "px" : ""));
        this.$fromList.css('maxHeight', maxHeight + (isNumeric(maxHeight) ? "px" : ""));

        return this;
    };

    MultiSelect.prototype.isChanged = function() {
        if (this.orgSelectedItems) {
            var selectedItems = this.getSelectedItems();
            if (this.orgSelectedItems.length != selectedItems.length) {
                return true;
            }
            for (var i in selectedItems) {
                if (this.orgSelectedItems.indexOf(selectedItems[i]) < 0) {
                    return true;
                }
            }
        }
        return false;
    };

    MultiSelect.prototype.searchTo = function(keyword) {
        if (typeof keyword === "undefined") {
            keyword = this.$toColumn.find('input[type="search"]').val();
        }
        this.$toList.children(".multiselect-column-item").each(function() {
            var $this = $(this),
                itemData = $this.data(MultiSelect.DATA_KEY);
            if (keyword && itemData.name.indexOf(keyword) < 0) {
                $this.hide();
            } else {
                $this.show();
            }
            itemData = null;
            $this = null;
        });

        return this;
    };

    MultiSelect.prototype.searchFrom = function(keyword) {
        if (typeof keyword === "undefined") {
            keyword = this.$fromColumn.find('input[type="search"]').val();
        }
        this.$fromList.children(".multiselect-column-item").each(function() {
            var $this = $(this),
                itemData = $this.data(MultiSelect.DATA_KEY);
            if (keyword && itemData.name.indexOf(keyword) < 0) {
                $this.hide();
            } else {
                $this.show();
            }
            itemData = null;
            $this = null;
        });

        return this;
    };

    MultiSelect.prototype.loadMoreTo = function() {
        var self = this;
        if (typeof this.options.toColumn.loadMore === "function") {
            var num = this.loadedNumTo;
            var ret = this.options.toColumn.loadMore.call(this, num);
            if (ret && typeof ret.done === "function") {
                this.loadingMoreTo();
                ret.done(function(items) {
                    if ($.isArray(items) && items.length) {
                        self.loadedMoreTo(items.length);
                        self.addSelectedItems(items);
                    } else {
                        self.doneMoreTo();
                    }
                }).fail(function() {
                    self.errorMoreTo.apply(self, arguments);
                });
            } else {
                self.doneMoreTo();
            }
        }

        return this;
    };

    MultiSelect.prototype.loadMoreFrom = function() {
        var self = this;
        if (typeof this.options.fromColumn.loadMore === "function") {
            var num = this.loadedNumFrom;
            var ret = this.options.fromColumn.loadMore.call(this, num);
            if (ret && typeof ret.done === "function") {
                this.loadingMoreFrom();
                ret.done(function(items) {
                    if ($.isArray(items) && items.length) {
                        self.loadedMoreFrom(items);
                        self.addUnSelectedItems(items);
                    } else {
                        self.doneMoreFrom();
                    }
                }).fail(function() {
                    self.errorMoreFrom.apply(self, arguments);
                });
            } else {
                self.doneMoreFrom();
            }
        }

        return this;
    };

    MultiSelect.prototype.loadingMoreTo = function() {
        this.$toList.find(".multiselect-column-more")
            .removeClass("error")
            .addClass("loading")
            .children("a").text("正在加载...");

        return this;
    };

    MultiSelect.prototype.loadingMoreFrom = function() {
        this.$fromList.find(".multiselect-column-more")
            .removeClass("error")
            .addClass("loading")
            .children("a").text("正在加载...");

        return this;
    };

    MultiSelect.prototype.loadedMoreTo = function(loadedNum) {
        this.loadedNumTo = this.loadedNumTo || 0;
        if (typeof loadedNum === "number" && loadedNum >= 0) {
            this.loadedNumTo += loadedNum;
        }
        this.$toList.find(".multiselect-column-more")
            .removeClass("loading")
            .children("a").text("加载更多");

        return this;
    };

    MultiSelect.prototype.loadedMoreFrom = function(loadedNum) {
        this.loadedNumFrom = this.loadedNumFrom || 0;
        if (typeof loadedNum === "number" && loadedNum >= 0) {
            this.loadedNumFrom += loadedNum;
        }
        this.$fromList.find(".multiselect-column-more")
            .removeClass("loading")
            .children("a").text("加载更多");

        return this;
    };

    MultiSelect.prototype.errorMoreTo = function() {
        this.$toList.find(".multiselect-column-more")
            .removeClass("loading")
            .addClass("error")
            .children("a").text("加载失败！点击重新加载");

        return this;
    };

    MultiSelect.prototype.errorMoreFrom = function() {
        this.$fromList.find(".multiselect-column-more")
            .removeClass("loading")
            .addClass("error")
            .children("a").text("加载失败！点击重新加载");

        return this;
    };

    MultiSelect.prototype.doneMoreTo = function() {
        this.$toList.find(".multiselect-column-more")
            .removeClass("loading loaded error")
            .addClass("done")
            .children("a").text("没有更多项了");

        return this;
    };

    MultiSelect.prototype.doneMoreFrom = function() {
        this.$fromList.find(".multiselect-column-more")
            .removeClass("loading loaded error")
            .addClass("done")
            .children("a").text("没有更多项了");

        return this;
    };

    MultiSelect.prototype.addSelectedItems = function(items) {
        var $toItems = this.createItems(items, MultiSelect.TYPE_SELECTED);
        this.$toList.children(".multiselect-column-item:last").after($toItems);

        return this;
    };

    MultiSelect.prototype.addUnSelectedItems = function(items) {
        var $fromItems = this.createItems(items, MultiSelect.TYPE_UNSELECTED);
        this.$fromList.children(".multiselect-column-item:last").after($fromItems);

        return this;
    };

    MultiSelect.prototype.setSelectedItems = function(items) {
        var $toItems = this.createItems(items, MultiSelect.TYPE_SELECTED);
        this.$toList.empty().append($toItems);
        this.createMoreItem(MultiSelect.TYPE_SELECTED);

        return this;
    };

    MultiSelect.prototype.setUnSelectedItems = function(items) {
        var $fromItems = this.createItems(items, MultiSelect.TYPE_UNSELECTED);
        this.$fromList.empty().append($fromItems);
        this.createMoreItem(MultiSelect.TYPE_UNSELECTED);

        return this;
    };

    MultiSelect.prototype.getSelectedItems = function() {
        var data = [], itemData;
        this.$toList.children(".multiselect-column-item").each(function() {
            itemData = $(this).data(MultiSelect.DATA_KEY);
            itemData && data.push(itemData);
        });
        return data;
    };

    MultiSelect.prototype.getSelectedData = function() {
        var self = this, data = [],
            items = this.getSelectedItems();
        $.each(items, function(i, item) {
            data.push(self._getDataSource(item.originalData));
        });
        return data;
    };

    MultiSelect.prototype.getUnSelectedItems = function() {
        var data = [], itemData;
        this.$fromList.children(".multiselect-column-item").each(function() {
            itemData = $(this).data(MultiSelect.DATA_KEY);
            itemData && data.push(itemData);
        });
        return data;
    };

    MultiSelect.prototype.getUnSelectedData = function() {
        var self = this, data = [],
            items = this.getUnSelectedItems();
        $.each(items, function(i, item) {
            data.push(self._getDataSource(item.originalData));
        });
        return data;
    };

    MultiSelect.prototype._getDataSource = function(data) {
        if (!data || !this.options.dataSrc || typeof data !== "object") return data;
        var result;
        if (typeof (this.options.dataSrc) === "object") {
            $.each(this.options.dataSrc, function(i, item) {
                !result && (result = {});
                result[item] = data[item];
            });
        } else {
            result = data[this.options.dataSrc];
        }
        return result;
    };

    var old = $.fn.multiSelect;

    $.fn.multiSelect = function(options) {
        var $this = $(this), inst;
        if (!(inst = $this.data(MultiSelect.INST_KEY))) {
            $this.data(MultiSelect.INST_KEY, (inst = new MultiSelect(this, options)));
        }
        if (typeof options === "string" && inst) {
            var called = inst[options];
            if (typeof called === "function") {
                var args = Array.prototype.slice.call(arguments, 1);
                return called.apply(inst, args);
            } else {
                throw "MultiSelect Error: Method " + called + " does not exist";
            }
        }
        return this;
    };

    $.fn.multiSelect.Constructor = MultiSelect;

    // noConflict
    $.fn.multiSelect.noConflict = function() {
        $.fn.multiSelect = old;
        return this;
    };

    return MultiSelect;
});