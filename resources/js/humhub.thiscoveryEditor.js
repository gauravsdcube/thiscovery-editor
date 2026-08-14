/**
 * Thiscovery Editor — HumHub JS API wrapper around the Lexical IIFE.
 */
humhub.module('thiscoveryEditor', function (module, require, $) {
    var api = function () {
        return window.ThiscoveryEditor || null;
    };

    var initEditors = function ($scope) {
        var ed = api();
        if (!ed || typeof ed.init !== 'function') {
            return;
        }
        var $ctx = ($scope && $scope.length) ? $scope : $(document);
        $ctx.find('[data-te-editor]').each(function () {
            try {
                ed.init(this);
            } catch (e) {}
        });
    };

    var destroyEditors = function ($scope) {
        var ed = api();
        if (!ed || typeof ed.destroy !== 'function') {
            return;
        }
        var $ctx = ($scope && $scope.length) ? $scope : $(document);
        $ctx.find('[data-te-editor]').each(function () {
            try {
                ed.destroy(this);
            } catch (e) {}
        });
    };

    var saveEditors = function ($scope) {
        var ed = api();
        if (!ed) {
            return;
        }
        try {
            if ($scope && $scope.length && typeof ed.save === 'function') {
                $scope.find('[data-te-editor]').each(function () {
                    ed.save(this);
                });
            } else if (typeof ed.saveAll === 'function') {
                ed.saveAll();
            }
        } catch (e) {}
    };

    var init = function () {
        // Instances are mounted by consumers (page builder).
    };

    module.export({
        init: init,
        initEditors: initEditors,
        destroyEditors: destroyEditors,
        saveEditors: saveEditors,
        saveAll: function () {
            var ed = api();
            if (ed && typeof ed.saveAll === 'function') {
                ed.saveAll();
            }
        },
        initOnAjaxLoad: false,
    });
});
