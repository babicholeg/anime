let preprocessor = 'sass';
const { src, dest, parallel, series, watch } = require('gulp');
const browserSync = require('browser-sync').create();
const pug = require('gulp-pug');
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const sass = require('gulp-sass')(require('sass'));
const less = require('gulp-less');
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');
const cleancss = require('gulp-clean-css');
const csscomb = require('gulp-csscomb');
const imagecomp = require('compress-images');
const svgSprite = require('gulp-svg-sprite');
const svgmin = require('gulp-svgmin');
const cheerio = require('gulp-cheerio');
const replace = require('gulp-replace');
const del = require('del');

function browsersync() {
	browserSync.init({
		server: { baseDir: 'app/' },
		notify: false,
		online: true
	})
}

const svgspriteConfig = {
	mode: {
		symbol: true
	}
};

function buildSvg() {
	return src('**/*.svg', { cwd: 'app/assets/svg' })
		.pipe(svgmin({
			js2svg: {
				pretty: true,
			}
		}))
		.pipe(cheerio({
			run: function ($) {
				$('[stroke]').removeAttr('stroke');
				$('[fill]').removeAttr('fill');
				$('[style]').removeAttr('style');
			},
			parserOptions: { xmlMode: true }
		}))
		.pipe(replace('&gt;', '>'))
		.pipe(svgSprite(svgspriteConfig))
		
		.pipe(dest('app/assets'))
		.pipe(browserSync.stream());
}

function html() {
	return src('app/pug/*.pug')
		.pipe(
			pug({
				pretty: true,
			})
		)
		.pipe(dest('app/'))
}

function scripts() {
	return src([
		//'node_modules/bootstrap/js/src/scrollspy.js',
		//'node_modules/jquery/dist/jquery.min.js',
		//'node_modules/jquery-ui/dist/jquery-ui.min.js',
		//'node_modules/swiper/swiper-bundle.min.js',
		//'node_modules/wow.js/dist/wow.min.js',
		'app/assets/js/app.js',
	])
		.pipe(concat('app.min.js'))
		.pipe(uglify())
		.pipe(dest('app/assets/js'))
		.pipe(browserSync.stream())
}

function styles() {
	return src('app/' + preprocessor + '/main.' + preprocessor + '')
		.pipe(sourcemaps.init())
		.pipe(eval(preprocessor)())
		.pipe(concat('app.min.css'))
		.pipe(autoprefixer({ overrideBrowserslist: ['last 10 versions'], grid: true }))
		//.pipe(csscomb())
		.pipe(cleancss({ level: { 1: { specialComments: 0 } }/* , format: 'beautify' */ }))
		.pipe(sourcemaps.write('../maps'))
		.pipe(dest('app/assets/css/'))
		.pipe(browserSync.stream())
}

async function images() {
	imagecomp(
		"app/assets/images/src/**/*",
		"app/assets/images/dest/",
		{ compress_force: false, statistic: true, autoupdate: true }, false,
		{ jpg: { engine: "mozjpeg", command: ["-quality", "75"] } },
		{ png: { engine: "pngquant", command: ["--quality=75-100", "-o"] } },
		{ svg: { engine: "svgo", command: "--multipass" } },
		{ gif: { engine: "gifsicle", command: ["--colors", "64", "--use-col=web"] } },
		function (err, completed) { 
			if (completed === true) {
				browserSync.reload()
			}
		}
	)
}

function cleanimg() {
	return del('app/assets/images/dest/**/*', { force: true })
}

function buildcopy() {
	return src([
		'app/assets/css/**/*.min.css',
		'app/assets/js/**/*.min.js',
		'app/assets/images/dest/**/*',
		'app/**/*.html',
	], { base: 'app' }) 
		.pipe(dest('dist'))
}

function cleandist() {
	return del('dist/**/*', { force: true })
}

function startwatch() {

	watch(['app/**/*.js', '!app/**/*.min.js'], scripts);
	watch('app/**/' + preprocessor + '/**/*', styles);
	watch('app/pug/**/*.pug').on('change', html);
	watch('app/*.html').on('change', browserSync.reload);
	watch('app/assets/images/src/**/*', images);
	watch('app/assets/svg/*', buildSvg);

}

exports.browsersync = browsersync;
exports.html = html;
exports.scripts = scripts;
exports.styles = styles;
exports.images = images;
exports.cleanimg = cleanimg;
exports.buildSvg = buildSvg;
exports.build = series(cleandist, styles, scripts, images, buildcopy);
exports.default = parallel(styles, scripts, buildSvg, browsersync, startwatch);