<!-- Additional diamond marker on an existing SubStripe — visual knot at branch point -->
<div class="diamond-marker">
  <div class="diamond"></div>
</div>

<style>
  .diamond-marker {
    position: relative;
    height: 0;
  }

  .diamond-marker .diamond {
    /* 18px padding-left + 7px diamond offset = 25px from content edge */
    left: -25px;
    top: -5px;
    animation: diamond-in 0.15s ease-out;
  }

  @keyframes diamond-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
