/**
 * Global sweetness for UX interactions
 *
 * @author sergii gamaiunov (2013, 2014, 2015, 2016)
 */
var alpha = window.alpha || {}; // namespace

function getScripts(scripts, callback) {
  if (!scripts || !scripts.length)
    return callback();
  var progress = 0;
  scripts.forEach(function(script) {
    $.getScript( script )
        .done(function( script, textStatus ) {
          if (++progress == scripts.length) callback();
        })
        .fail(function( jqxhr, settings, exception ) {
          if (++progress == scripts.length) callback();
        });
  });
}

$.multiEval = function(arr) {
  var _arr = $.map(arr, function(scr) {
    return eval( scr );
  });
  _arr.push($.Deferred(function( deferred ){
    $( deferred.resolve );
  }));
  return $.when.apply($, _arr);
};

alpha.ux = (function ($) {
  this.modal = null;
  var _bu = '';
  var initialized = false;


  function modalControlEl(el) {
    alpha.ux.modalControlElModal(el, alpha.ux.modal);
  }
  return {

    handleAjaxAssets: function(data, cb) {
      var $html = $('<div></div>').html(data);
      var scriptFiles = [];
      $('script[src]', $html).filter(function() {
        scriptFiles.push(this.src);
        return true; // return true so we can `remove()` it
      }).remove();
      if (scriptFiles) {
        getScripts(scriptFiles, function() {
          if(cb) cb($html)
        });
      } else if(cb) {
        cb($html);
      }
    },

    modalControlElModal: function (el, modal, cb) {
      var self = $(el),
          url = self.attr('data-href') || self.attr('href'),
          data = self.data('params') || '',
          push_history = self.attr('push-history') ? self.attr('push-history') : false;
      if(typeof data === 'object') {
        data = $.param(data);
      }
      var test = self.text(),
          w = self.width();
      self.css('width', w)
          .attr('disabled', true)
          .html('<span class="fa fa-spinner fa-spin"></span>');
      var resetBtn = function () {
        self.html(test)
            .css('width', 'auto')
            .removeAttr('disabled');
      };
      if (push_history) {
        document.location.hash = (push_history == true ? 'alpha.ux:' + url : push_history);
      }
      modal.modal('show') ;
      modal.find('.modal-content').html('<div class="loader-crcl"></div>') ;

      $.get(url, function(data) {
        resetBtn();
        function drawform($html) {
          modal.modal('show') ;
          modal.find('.modal-content').html($html);
          if (cb) cb(data);
          else {
            modal.find('.modal-content')
                .off('submit', 'form', alpha.ux.formAjaxSubmit)
                .on('submit', 'form', alpha.ux.formAjaxSubmit);
          }
        }
        alpha.ux.handleAjaxAssets(data, function(content) {
          drawform(content)
        });
      });
    },

    /**
     * @author sabl0r
     * @link https://gist.github.com/sabl0r/e8f37147a2a263f4b860
     * @param message
     * @param headline
     * @param cb
     * @param cancelLabel
     * @param okLabel
     */
    confirmDialog: function(message, headline, cb, cancelLabel, okLabel) {
      var dialog = '<div class=" confirm mfp-with-anim white-popup">';
      if (headline) dialog += '<h2>' + headline + '</h2>';
      dialog += '<div class="mfp-conten"><p>' + message + '</p></div>'
          + '<div class="actions">'
          + '<button type="button" class="btn btn-default btn-cancel">' + (cancelLabel || 'Cancel') + '</button> '
          + '<button type="button" class="btn btn-primary btn-submit">' + (okLabel || 'Ok') + '</button>'
          + '</div></div>';
      $.magnificPopup.open({
        modal: true,
        items: {
          src: dialog,
          type: 'inline'
        },
        callbacks: {
          open: function() {
            var $content = $(this.content);
            $content.on('click', '.btn-submit', function() {
              if (typeof cb == 'function') {
                cb(true);
              }
              $.magnificPopup.close();
              $(document).off('keydown', keydownHandler);
            });

            $content.on('click', '.btn-cancel', function() {
              $.magnificPopup.close();
              $(document).off('keydown', keydownHandler);
            });
            var keydownHandler = function (e) {
              if (e.keyCode == 13) {
                $content.find('.btn-submit').click();
                return false;
              } else if (e.keyCode == 27) {
                $content.find('.btn-cancel').click();
                return false;
              }
            };
            $(document).on('keydown', keydownHandler);
          }
        }
      });
    },

    /**
     * This callback is general callback to handle success response of AJAX request/JSON server response
     *
     * @param data
     * @param trigger
     * @param form
     * @param callback
     * @returns {*}
     */
    jsonSuccess: function(data, trigger, form, callback)
    {
      if(data.clearMessages) $('.notifications').html('');
      if($.isArray(data.msg))
        $.each(data.msg, function (idx, message) {
          //alpha.ux.jsonSuccess(this.msg, this.type);
          alpha.ux.notify(message.msg, message.type, null, (message.msgOptions?message.msgOptions:null));
        });
      else
        alpha.ux.notify(data.msg, data.type, null, (data.msgOptions?data.msgOptions:null));

      // refresh page after XX seconds:
      if(data.refreshPage) {
        refreshTimeout = data.refreshPage * 1000;
        setTimeout(function() {location.reload()}, refreshTimeout)
      }
      if(data.forwardUrl) {
        if(data.forwardTimeout) {
          // redirect after timeout
          refreshTimeout = data.forwardTimeout * 1000;
          setTimeout(function() { window.location=data.forwardUrl;}, refreshTimeout)
        } else {
          // redirect right away:
          window.location=data.forwardUrl;
        }
      }
      if(data.repeatRequest) {
        // repeat same request
        if(data.requestNextStep)
          return callback(data.requestNextStep)
        else
          return  callback();
      }
      if(data.dismiss && data.dismiss == true)
        $('.modal').modal('hide');

      /**
       * easy way to update any DOM element on screen by server
       */
      if(data.updateValues) {
        $.each(data.updateValues,function(index,value){
          var el;
          el = $('[data-value-update-point="'+index+'"]');
          if(el) {
            el.html(value);
          }
        });
      }

      if (data.updateViews) {
        alpha.ux.updateViews(data.updateViews, data.content);
      }

      if(trigger) {
        if (trigger.attr('data-afterupdate-callback')) {
          var cb = trigger.attr('data-afterupdate-callback');
          window[cb]();
        }
        trigger.button('reset');
        if (trigger.attr('data-update'))
          alpha.ux.updateViews(trigger.attr('data-update'), data.content);
      }
    },

    bu: function(url){
      if (_bu == '')
        _bu = $('#hid-base-url').val();
      return _bu + url.replace(/^\/|\/$/g, '');
    },

    /**
     * Pushes notifications
     * @param msg
     * @param type
     * @param pos
     */
    notify:function (msg, type, pos, fadeOptions)
    {
      type = type || 'info';
      pos = pos || 'top-right';
      //$.get('/site/clientReport', {message: 'CLIENT_ERROR'});
      if(!fadeOptions || fadeOptions==[] || fadeOptions == {}) {
        if(type=='error' || type == 'alert')
          fadeOptions = { enabled: true, delay: 20000 };
        else
          fadeOptions = { enabled: true, delay: 3000 };
      }
//            Messenger().post({
//                message: msg,
//                type: type,
//                showCloseButton: true
//
//            })
      if (msg) {
        alpha.ux.modal.modal('show') ;
        alpha.ux.modal.find('.modal-content').html(msg) ;
      }
      // alert(msg);
      //$('.notifications').addClass(pos).notify({
      //  fadeOut: fadeOptions,
      //  message:{html:msg },
      //  type:type // supports warning, error, etc (all types of alerts styles)
      //}).show();
    },

    /**
     * array of multiple notifiers
     * @param data
     */
    multiple_notify:function (data) {
      $.each(data, function () {
        alpha.ux.notify(this.msg, this.type);
      });
    },

    /**
     * helper function to scroll to top
     */
    scrollTop:function () {
      $('html, body').animate({
        scrollTop:$('.navbar-primary:first').offset().top
      }, 1000);
    },

    /**
     * utility method to update multiple views
     * @param update
     * @return {Boolean}
     */
    updateViews:function (update, content) {
      if (!update)
        return false;
      content = content || "";
      update = update.indexOf("|") ? update.split("|") : [update];

      $.each(update, function () {
        var item = this.split(':'); // format: g:ID <- update a grid, ID is the grid
        switch (item[0]) {
          case 'g': // is a gridview that we have to update
            $('#' + item[1]).yiiGridView('update');
            break;
          case 'l':  // is a listView
            $.fn.yiiListView.update(item[1], {});
            break;
          case 'e':  // is a DOM
            if ($(item[1]).length && item[2]) { // append
              $(item[1]).append(content);
            } else {
              $(item[1]).html(content);
            }
            break;
        }
      });
    },

    /**
     * created to attach url redirection functionality to certain buttons
     */
    controlUrl:function (e) {
      e.preventDefault();
      var that = $(this),
          url = that.prop('href') || that.attr('data-href');
      if (!url) {
        return false;
      }
      var confirm = that.attr('data-confirm');
      if (confirm) {
        alpha.ux.confirmDialog(confirm, function (response) {
          if (response) {
            document.location.href = url;
          }
          return response;
        });
      } else {
        document.location.href = url;
      }
      return true;
    },

    /**
     * Handles a form submission via ajax call through meta-data and updates views (grids | lists) if specified
     * @return {*}
     */
    controlAjaxSubmit:function (e)
    {
      var self = $(this), frm;
      if(self.attr('data-target-form')) {
        frm = $(self.attr('data-target-form'));
      } else {
        frm = $(this.form);
      }
      var flag = alpha.ux.validateRequired(frm);

      // Binding to inputs outside of form
      var req_elt;
      if(self.attr('data-bind-input')) {
        req_elt=$(self.attr('data-bind-input'));
        if(req_elt) {
          if(!$.trim(req_elt.val()).length) {
            if(req_elt.hasClass('required')) {
              alpha.ux.notify(req_elt.attr('data-name') + " is required", 'error');
              return flag = false;
            }
          }
        }
      }
      if (!flag) { e.preventDefault();
        return;
      }
      var post_data = frm.serializeArray();
      post_data = jQuery.param(post_data);
      // Hey, why not take *complete* form data? LAet's do this:
      if(self.attr('name')) {
        post_data += '&'+self.attr('name')+'=true';
      }

      var fn = function (next_step) {
        var url = frm.attr('action');
        self.button('loading');

        $(':input', frm).not(':hidden').attr('readonly', 'readonly');
        if(next_step) {
          var has_it = post_data.indexOf('&step='+next_step);
          if(has_it == -1)
            post_data += '&step='+next_step;
        }
        $.ajax({
          url:url,
          data:post_data,
          type:'post',
          dataType:'json',
          success:function (data) {
            $(':input', frm).not(':hidden').removeAttr('readonly');
            alpha.ux.jsonSuccess(data, self, frm, fn);
          },
          error:function (xhr) {
            $(':input', frm).not(':hidden').removeAttr('readonly');
            alpha.ux.notify(xhr.responseText, 'error');
            self.button('reset');
            if (self.attr('ignore-form-reset') != 'true' && frm)
              frm[0].reset();
          }
        });
      }
      var confirm = self.attr('data-confirm');
      if (confirm) {
        alpha.ux.confirmDialog(confirm, function(result){
          if(result){
            fn();
          }
        });
        return false;
      }
      fn();
      return false;
    },

    /**
     * displays a Modal
     */
    modalControl:function (e) {
      e.preventDefault();
      modalControlEl(this);
    },

    /**
     * displays a Modal
     */
    modalControlEl:function (el) {
      alpha.ux.init(function() {
        modalControlEl(el);
      })
    },

    /**
     * Submit a form, useful for submit controls outside of FORM element
     * known issue: does not send `name` value of clicked button
     */
    controlSubmit:function () {
      var that =  $(this), frm;
      if(that.attr('data-target-form')) {
        frm = $(that.attr('data-target-form'));
      } else if(that.attr('data-form')) {
        var selectorName = that.attr('data-form');
        if(selectorName.charAt(0) != '['
            && selectorName.charAt(0) != '#'
            && selectorName.charAt(0) != '.') {
          selectorName = '#' + selectorName;
        }
        frm = $(selectorName);
      }  else {
        frm = $(this.form);
      }
      if(!frm) {
        frm = this.form;
      } else {
        if(typeof frm !== 'object') {
          frm = $('#' + frm);
        }
      }
      if (!frm && !frm.length) {
        return alpha.ux.notify('Unable to get a form reference!', 'error');
      }
      var msg = $(this).attr('data-confirm');
      if(msg) {
        alpha.ux.confirmDialog(msg, function (result) {
          if (result) {
            that.button('loading');
            frm.submit();
            return true;
          }
        });
        return false;
      } else {
        that.button('loading');
        frm.submit();
        return true;
      }
    },

    /**
     * @since 2016-12-01
     */
    formSubmit:function () {
      var that =  $(this), msg = $(this).attr('data-confirm');
      if(msg) {
        alpha.ux.confirmDialog(msg, '', function (result) {
          if (result) {
            that.find('input[type=submit]').prop('disabled', true);
            return true;
          }
        });
        return false;
      } else {
        that.find('input[type=submit],button[type=submit]').prop('disabled', true);
        return true;
      }
    },

    /**
     * By default, you can provide "data-loading-text" attribute value to button element to change loading text
     * @param e
     */
    controlButtonState:function(e) {
      $(this).button('loading');
    },

    /**
     * Displays confirmation alert box before proceeding with adding items to work bag
     */
    controlConfirm:function (e) {
      var self = $(this),
          msg = self.attr('data-msg') || 'No message found',
          url = self.attr('data-url');
      alpha.ux.confirmDialog(msg, function (result) {
        if (url && result) {
          document.location.href = url;
          return true;
        }
      });
      return false;
    },

    formAjaxSubmit: function(e) {
      e.preventDefault();
      var frm = $(this), self= this,
          sbmt = $('button.btn-submit', frm),
          flag = true,
          requiredInputs = frm.find('input.required');
      if(!sbmt || !sbmt.get(0)) {
        sbmt = $('.btn[type=submit]', frm);
      }
      requiredInputs.each(function () {
        var self = $(this);
        if (!$.trim(self.val()).length) {
          alpha.ux.notify(self.attr('data-name') + " is required", 'error');
          self.focus();
          return flag = false;
        }
      });
      if (!flag) return;
      if(this.viewsUpdateDebouce) clearTimeout(this.viewsUpdateDebouce);
      var fn = function () {
        var url = frm.attr('action');
        sbmt.button('loading');
        var formData = new FormData(frm[0]); //grab all form data
        $.ajax({
          url:url,
          data: formData,
          type:'POST',
          dataType:'json',

          success:function (data)
          {
            alpha.ux.jsonSuccess(data, sbmt, frm, fn);
            if($.isArray(data))
              alpha.ux.multiple_notify(data);
            else
              alpha.ux.notify(data.msg, data.type);
            sbmt.button('reset');
            if (frm.attr('data-update')) {
              if(frm.attr('data-debouce-update') && frm.attr('data-debouce-update')!= false) {
                self.viewsUpdateDebouce = setTimeout(function() {
                  alpha.ux.updateViews(frm.attr('data-update'), data.content);
                }, 5000);
              } else {
                alpha.ux.updateViews(frm.attr('data-update'), data.content);
              }
            }
          },
          error:function (xhr) {
            alpha.ux.notify(xhr.responseText, 'error');
            sbmt.button('reset');
            frm[0].reset();
          },

          // following settings are required for ability to post multipart/data forms
          async: true,
          cache: false,
          contentType: false,
          processData: false,
        });
      };
      var confirm = frm.attr('data-confirm');
      if (confirm) {
        alpha.ux.confirmDialog(confirm, function(result){
          if(result){
            fn();
          }
        });
        return false;
      }
      fn();
      return false;
    },

    validateRequired: function(root){
      var requiredFields = $(root).find('input.required, select.required').filter(":visible"),
          flag = true;
      requiredFields.each(function () {
        var selff = $(this);
        // conditional requirements
        if(selff.attr('data-require-if-not'))
        {
          var el = $(selff.attr('data-require-if-not'));
          if(el.attr('type')=='checkbox') {
            if(el.is(':checked')) {
              return flag = true;
            }
          }
        }
        if (!$.trim(selff.val()).length) {
          alpha.ux.notify(selff.attr('data-name') + " is required", 'error');
          selff.focus();
          return flag = false;
        }
      });
      return flag;
    },
    modal: modal,
    /**
     * module init
     */
    init:function (cb) {
      if (initialized) {
        return;
      }

      /**
       * @link https://github.com/yiisoft/yii2/issues/5005#issuecomment-59051709
       */
      function initCssFilter () {
        $(document).ajaxComplete (function (event, xhr, settings) {
          var styleSheets=[];
          $('link[rel=stylesheet]').each(function () {
            if ($.inArray(this.href, styleSheets) == -1) {
              styleSheets.push(this.href)
            } else {
              $(this).remove();
            }
          });
        })
      }
      initCssFilter();
      initialized = true;
      alpha.ux.modal = $('#ajax-modal-top');
      if (!alpha.ux.modal.length) {
        $('body').append('<div id="ajax-modal-top" class="modal fade"><div class="modal-dialog" role="document"><div class="modal-content"></div></div></div>');
        alpha.ux.modal = $('#ajax-modal-top');
      }
      // generic magnificPopup
      $('.magnific').each(function(){
        var $this = $(this);
        var opts = $this.data('mfp-options');
        if (typeof opts == 'object') {
          $this.magnificPopup(opts);
        } else {
          $(this).magnificPopup();
        }
      });
      $(document)
          .on('click', '.btn-control-confirm', this.controlConfirm)
          .on('click', '.btn-modal-control', this.modalControl)
          .on('click', '.btn-stateful', this.controlButtonState)
          .on('click', '.btn-control-url', this.controlUrl)
          .on('click', '.btn-control-submit', this.controlSubmit)
          .on('click', '.btn-control-ajax-submit', this.controlAjaxSubmit)
          .on('submit', '.form-ajax-submit', this.formAjaxSubmit)
          .on('submit', '.ux-form-submit', this.formSubmit)
      ;
      if (cb) {
        cb.call();
      }
    }
  };
})(jQuery);