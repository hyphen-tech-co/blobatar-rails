module SiteHelper
  SHAPES = { round: 0.11, organic: 0.35, boxy: 0.54, capsule: 0.65, nub: 0.745,
             cloud: 0.825, droplet: 0.888, hexagon: 0.933, sun: 0.965, triangle: 0.99 }.freeze
  TONES = { pastel: 0.1, pale: 0.28, mid: 0.49, deep: 0.71, bright: 0.865, ink: 0.965 }.freeze
  HUES = [12, 40, 78, 140, 190, 225, 275, 320].freeze
  NAMES = %w[alain astrid bao beatriz camille chidi elena emeka fatima freya gabriel
             hana ivan keiko kenji laura linnea mateo mira naoki noor priya ren
             svea tenzin tobias vera wei yara yuki zara].freeze
  AXES = [
    { key: "body.r", label: "size", group: "body" },
    { key: "body.ratio", label: "proportion", group: "body" },
    { key: "body.n", label: "squareness", group: "body" },
    { key: "body.rot", label: "tilt", group: "body", when: %w[boxy triangle hexagon] },
    { key: "capsule.squat", label: "squat", group: "body", when: %w[capsule] },
    { key: "poly.round", label: "corner rounding", group: "body", when: %w[triangle hexagon] },
    { key: "eye.rx", label: "size", group: "eyes" },
    { key: "eye.ratio", label: "roundness", group: "eyes" },
    { key: "eye.n", label: "squareness", group: "eyes" },
    { key: "eye.gap", label: "separation", group: "eyes" },
    { key: "eye.lean", label: "lean", group: "eyes" },
    { key: "gaze.x", label: "gaze x", group: "eyes" },
    { key: "gaze.y", label: "gaze y", group: "eyes" },
    { key: "hue", label: "hue", group: "color" },
    { key: "sun.n", label: "petals", group: "decoration", when: %w[sun], bands: 4 },
    { key: "sun.dist", label: "petal distance", group: "decoration", when: %w[sun] },
    { key: "sun.r", label: "petal size", group: "decoration", when: %w[sun] },
    { key: "sun.rot", label: "petal rotation", group: "decoration", when: %w[sun] },
    { key: "cloud.n", label: "lobes", group: "decoration", when: %w[cloud], bands: 3 },
    { key: "nub.n", label: "nubs", group: "decoration", when: %w[nub], bands: 2 },
    { key: "nub.a0", label: "nub angle", group: "decoration", when: %w[nub] },
    { key: "nub.r0", label: "nub size", group: "decoration", when: %w[nub] },
    { key: "droplet.tip", label: "tip length", group: "decoration", when: %w[droplet] }
  ].freeze

  def studio_catalog
    { shapes: SHAPES, tones: TONES, hues: HUES, names: NAMES, axes: AXES,
      expressions: Blobatar::Rails::Options::EXPRESSIONS }
  end

  def studio_data(editor: false)
    { controller: "studio", studio_editor_value: editor, studio_catalog_value: studio_catalog,
      studio_name_value: @name, studio_pinned_value: @pinned, studio_options_value: @options,
      studio_expression_value: @expression, studio_motion_value: @motion }
  end

  def studio_icon(kind)
    paths = {
      tune: '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="2"/><circle cx="15" cy="17" r="2"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',
      shuffle: '<path d="m17 3 4 4-4 4M3 7h3c5 0 7 10 12 10h3M17 13l4 4-4 4M3 17h3c2 0 3-2 4-4M14 8c1-1 2-1 4-1h3"/>',
      download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
      lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8.5 11V7.5a3.5 3.5 0 0 1 7 0V11"/>',
      github: '<path d="M9 19c-4 1-4-2-6-2m12 5v-3.5c0-1 .1-1.5-.5-2 3-.4 6-1.5 6-6A5 5 0 0 0 19 7' \
              "c.2-1 .2-2-.2-3-1 0-2 .5-3 1a14 14 0 0 0-7 0C7 4.5 6 4 5 4c-.4 1-.4 2-.2 3" \
              'a5 5 0 0 0-1.5 3.5c0 4.5 3 5.6 6 6-.6.5-.5 1-.5 2V22"/>',
      arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
      check: '<path d="m4 12 5 5L20 6"/>',
      close: '<path d="m6 6 12 12M6 18 18 6"/>'
    }
    tag.svg(paths.fetch(kind).html_safe, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
                                         "stroke-width": 1.7, "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": true, class: "icon")
  end
end
