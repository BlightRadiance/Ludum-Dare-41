THREE.Shader = {

	uniforms: {
		"tDiffuse": { value: null },
		"amount":   { value: 0.002 },
		"angle":    { value: 0.0 },
		"dimm":     { value: 1.0 },
	},

	vertexShader: [
		"varying vec2 vUv;",

		"void main() {",
			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0);",
		"}"

	].join( "\n" ),

	fragmentShader: [
		"uniform sampler2D tDiffuse;",
		"uniform float amount;",
		"uniform float angle;",
		"uniform float dimm;",
		"varying vec2 vUv;",

		"void main() {",
			"vec2 offset = amount * vec2( cos(angle), sin(angle));",
			"vec4 cr = texture2D(tDiffuse, vUv + offset);",
			"vec4 cga = texture2D(tDiffuse, vUv);",
			"vec4 cb = texture2D(tDiffuse, vUv - offset);",
			"gl_FragColor = vec4(cr.r * dimm, cga.g * dimm, cb.b * dimm, cga.a);",
		"}"
	].join( "\n" )

};
