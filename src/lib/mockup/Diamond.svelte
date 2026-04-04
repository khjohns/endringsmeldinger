<!-- Additional diamond marker on an existing SubStripe — no notice box, just the visual knot -->
<div class="diamond-marker">
  <div class="diamond"></div>
</div>

<style>
  .diamond-marker {
    position: relative;
    height: 0;
  }

  .diamond {
    position: absolute;
    left: -25px;
    top: -5px;
    width: 11px;
    height: 11px;
    background: var(--green);
    transform: rotate(45deg);
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
