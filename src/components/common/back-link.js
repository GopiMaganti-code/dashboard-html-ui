;(function(global){
  function renderBackSetupButtons(openSetupScreenFn){
    var selector = 'button.btn-setup[title="Back to campaign setup"][aria-label="Back to campaign setup"]';
    document.querySelectorAll(selector).forEach(function(btn){
      var text = btn.querySelector('.btn-setup-text');
      if (text) text.textContent = 'Back';
      if (typeof openSetupScreenFn === 'function') {
        btn.onclick = function(){
          return openSetupScreenFn();
        };
      }
    });
  }

  global.AppBackLink = {
    renderBackSetupButtons: renderBackSetupButtons
  };
})(window);
