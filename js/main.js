jQuery(document).ready(function($) {
  $('.pricing li').click(function(evt) {
    var $tar = $(evt.currentTarget);

    if ($tar.hasClass('expanded')) {
      $tar.removeClass('expanded');
      $tar.find('.fa-angle-up').removeClass(
        'fa-angle-up').addClass('fa-angle-down');
      $tar.find('.info').slideUp(200);
    } else {
      $tar.addClass('expanded');
      $tar.find('.fa-angle-down').removeClass(
        'fa-angle-down').addClass('fa-angle-up');
      $tar.find('.info').slideDown(200);
    }
  });

  var checkoutPlan;
  var checkout = window.StripeCheckout.configure({
    allowRememberMe: false,
    image: 'https://s3.amazonaws.com/pritunl-static/logo_stripe.png',
    key: 'pk_live_plmoOl3lS3k5dMNQViZWGfVR',
    zipCode: true,
    closed: function() {
      checkoutUnlock();
    }.bind(this),
    token: function(token) {
      checkoutLock();
      checkoutAlert('success', 'Order processing, please wait...');

      $.ajax({
        type: 'POST',
        url: 'https://app.pritunl.com/subscription',
        contentType: 'application/json',
        dataType: 'json',
        data: JSON.stringify({
          plan: checkoutPlan,
          card: token.id,
          email: token.email
        }),
        success: function(response) {
          checkoutAlert('success', response.msg);
          checkoutUnlock();
        }.bind(this),
        error: function(response) {
          if (response.responseJSON) {
            checkoutAlert('danger', response.responseJSON.error_msg);
          }
          else {
            checkoutAlert('danger',
              'Server error occured, please try again later.');
          }
          checkoutUnlock();
        }.bind(this)
      });
    }.bind(this)
  });
  var checkoutAlert = function(alertType, alertMsg) {
    var $alert = $('.subscription-' + checkoutPlan + ' .alert');

    $alert.removeClass('alert-success alert-info alert-danger');
    if (alertType) {
      $alert.addClass('alert-' + alertType);
    }
    $alert.text(alertMsg || '');
    $alert.slideDown(250);
  };
  var checkoutLock = function() {
    $('.subscription-zero .credit-pay').attr('disabled', 'disabled');
    $('.subscription-zero .apple-pay').attr('disabled', 'disabled');
    $('.subscription-support .credit-pay').attr('disabled', 'disabled');
    $('.subscription-support .apple-pay').attr('disabled', 'disabled');
  };
  var checkoutUnlock = function() {
    $('.subscription-zero .credit-pay').removeAttr('disabled');
    $('.subscription-zero .apple-pay').removeAttr('disabled');
    $('.subscription-support .credit-pay').removeAttr('disabled');
    $('.subscription-support .apple-pay').removeAttr('disabled');
  };
  var checkoutOpen = function(plan) {
    checkoutPlan = plan;

    if (plan === 'zero') {
      checkout.open({
        amount: 5000,
        name: 'Pritunl Zero - 7 Day Trial',
        description: 'Subscribe to Zero ($50/month)',
        panelLabel: 'Subscribe'
      });
    } else {
      checkout.open({
        amount: 25000,
        name: 'Pritunl Support',
        description: 'Subscribe to Support ($250/month)',
        panelLabel: 'Subscribe'
      });
    }
  };
  var checkoutApple = function(plan) {
    checkoutPlan = plan;

    var paymentRequest;
    if (plan === 'zero') {
      paymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        requiredShippingContactFields: ['email'],
        total: {
          label: 'Zero ($50/month)',
          amount: '50.00'
        }
      };
    } else {
      paymentRequest = {
        countryCode: 'US',
        currencyCode: 'USD',
        requiredShippingContactFields: ['email'],
        total: {
          label: 'Support ($250/month)',
          amount: '250.00'
        }
      };
    }

    var session = Stripe.applePay.buildSession(paymentRequest,
      function(result, completion) {
        $.ajax({
          type: 'POST',
          url: 'https://app.pritunl.com/subscription',
          contentType: 'application/json',
          dataType: 'json',
          data: JSON.stringify({
            plan: checkoutPlan,
            card: result.token.id,
            email: result.shippingContact.emailAddress
          }),
          success: function(response) {
            completion(ApplePaySession.STATUS_SUCCESS);
            checkoutAlert('success', response.msg);
          }.bind(this),
          error: function(response) {
            completion(ApplePaySession.STATUS_FAILURE);
            if (response.responseJSON) {
              checkoutAlert('danger', response.responseJSON.error_msg);
            }
            else {
              checkoutAlert('danger',
                'Server error occured, please try again later.');
            }
          }.bind(this)
        });
      }, function(error) {
        checkoutAlert('danger', error.message);
      });

    session.begin();
  };
  $('.subscription-zero .credit-pay').click(function() {
    checkoutOpen('zero');
  });
  $('.subscription-support .credit-pay').click(function() {
    checkoutOpen('support');
  });
  $('.subscription-zero .apple-pay').click(function() {
    checkoutApple('zero');
  });
  $('.subscription-support .apple-pay').click(function() {
    checkoutApple('support');
  });

  Stripe.setPublishableKey('pk_live_plmoOl3lS3k5dMNQViZWGfVR');
  Stripe.applePay.checkAvailability(function(available) {
    if (available) {
      $('.apple-pay').show('block');
    }
  });
});
