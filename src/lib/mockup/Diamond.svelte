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
    left: -25px;
    top: -5px;
    animation: diamond-in 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes diamond-in {
    from {
      opacity: 0;
      transform: rotate(45deg) scale(0);
    }
    to {
      opacity: 1;
      transform: rotate(45deg) scale(1);
    }
  }
</style>
