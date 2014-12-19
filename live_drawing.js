/**
* Live Drawing 0.1.3 - Prototype
* http://support.proboards.com/user/2671
* Copyright (C) 2014 pixelDepth.net
*/

$(function(){
	(function(){

		return {

			canvas: null,
			context: null,
			data_image: new Image(),
			data: "",

			has_drawn: false,

			mouse: {
				x: -1,
				y: -1
			},

			started: false,

			images: {},

			stroke_color: "000000",
			stroke_width: 2,
			drawing_star: false,
			drawing_spray: false,
			spray_timer: null,
			drawing_dropper: false,
			drawing_eraser: false,

			mouse_is_down: false,

			random_num: function(min, max){
  				return Math.floor(Math.random() * ((max - min) + 1)) + min;
			},

			create: {

				star: function(e){
					this.mouse.x = (e.pageX - this.canvas.offset().left);
					this.mouse.y = (e.pageY - this.canvas.offset().top);

					this.context.save();
					this.context.translate(this.mouse.x, this.mouse.y);
					this.context.beginPath();
					this.context.rotate(Math.PI / 180 * this.random_num(0, 180));
					this.context.scale(2, 2);
					this.context.strokeStyle = this.stroke_color;
					this.context.lineWidth = this.stroke_width;

					var i = 5;
					var length = 10;

					while(i){
						this.context.lineTo(0, length);
						this.context.translate(0, length);
						this.context.rotate((Math.PI * 2 / 10));
						this.context.lineTo(0, - length);
						this.context.translate(0, - length);
						this.context.rotate(- (Math.PI * 6 / 10));
						i--;
					}

					this.context.lineTo(0, length);
					this.context.closePath();
					this.context.stroke();
					this.context.restore();
				},

				spray: function(e){
					var i = 40;
					var radius = this.stroke_width;

					this.mouse.x = (e.pageX - this.canvas.offset().left);
					this.mouse.y = (e.pageY - this.canvas.offset().top);
					this.context.fillStyle = "#" + this.stroke_color;

					while(i){
						var offset_x = this.random_num(- radius, radius);
						var offset_y = this.random_num(- radius, radius);

						this.context.fillRect(this.mouse.x + offset_x, this.mouse.y + offset_y, 1, 1);
						i --;
					}

				}

			},

			init: function(){
				this.setup();

				if(yootil.location.check.posting() || yootil.location.check.editing() || yootil.location.check.messaging()){
					if(!!document.createElement("canvas").getContext){
						this.create_canvas();
						this.add_drawing_button();
						this.bind_events();
					}

					if(yootil.location.check.editing() || yootil.location.check.posting_quote() || yootil.location.check.message_quote()){
						this.get_data();
					}
				}

				var location_check = (yootil.location.check.search_results() || yootil.location.check.message_thread() || yootil.location.check.thread() || yootil.location.check.recent_posts() || $("div.container.posts.summary").length);

				if(location_check){
					this.convert_canvas_data();
				}
			},

			setup: function(){
				var plugin = proboards.plugin.get("pixeldepth_live_drawing");
				var settings = (plugin && plugin.settings)? plugin.settings : false;

				if(settings){
					this.images = plugin.images;
				}
			},

			create_canvas: function(){
				this.canvas = $("<canvas height='235' width='535px' style='border: 1px solid #000' id='pd_canvas'></canvas>");
				this.context = this.canvas.get(0).getContext("2d");
				this.context.shadowBlur = 2;
				this.context.lineCap = "round";
				this.context.lineJoin = "round";
				this.context.strokeStyle = "#000000";
				this.context.shadowColor = "rgba(0, 0, 0, 0.5)";
				this.context.save();
			},

			add_drawing_button: function(){
				var self = this;

				$(".controls").find(".bbcode-editor, .visual-editor").ready(function(){
					var img = $("<img />").attr({
						src: self.images.live_drawing,
						title: "Draw A Picture"
					}).click($.proxy(self.show_drawing_window, self));

					$(".controls").find(".bbcode-editor, .visual-editor").find(".group:last ul:last").append($("<li>").addClass("button").append(img));
				});
			},

			clear_auto_save: function(){
				proboards.autosave.clear();
			},

			bind_events: function(){
				var self = this;
				var the_form;

				if(yootil.location.check.editing()){
					the_form = yootil.form.edit_post_form();

					if(!the_form.length){
						the_form = yootil.form.edit_thread_form();
					}
				} else if(yootil.location.check.messaging()){
					the_form = yootil.form.message_form();

					if(!the_form.length){
						the_form = yootil.form.conversation_new_form();
					}
				} else {
					the_form = yootil.form.post_form();
				}

				if(the_form && the_form.length){
					the_form.bind("submit", function(event){
						if(!self.has_drawn){
							return;
						}

						var area = the_form.find("textarea[name=message]");
						var content = area.wysiwyg("getContent");

						if(!content.length || (yootil.location.check.posting_thread() && !the_form.find("input[name=subject]").val().length)){
							return;
						}

						content += "[div href=\"https://github.com/PopThosePringles/ProBoards-Live-Drawing\" title=\"" + self.canvas.get(0).toDataURL() + "\"][/div]";
						area.wysiwyg("setContent", content);
					});
				}
			},

			get_data: function(){
				var the_form;

				if(yootil.location.check.messaging()){
					the_form = yootil.form.message_form();
				} else if(yootil.location.check.editing()){
					the_form = yootil.form.edit_post_form();

					if(!the_form.length){
						the_form = yootil.form.edit_thread_form();
					}
				} else {
					the_form = yootil.form.post_form();
				}

				if(the_form && the_form.length){
					var textarea = the_form.find(".wysiwyg-textarea");
					var re = /((\[|<)div href=\"http:\/\/pd_live_drawing\.proboards\" title=\\?\"(data:image.+?)\\?\"(\]|>)(\[|<)\/div(\]|>))/ig;
					var data = null;


					if(textarea.val().match(re)){
						data = RegExp.$3;
						textarea.val(textarea.val().replace(RegExp.$1, ""));
					}

					if(proboards.dataHash["visualHtml"] && proboards.dataHash["visualHtml"].length && proboards.dataHash["visualHtml"].match(re)){
						data = RegExp.$3;
						proboards.dataHash["visualHtml"] = proboards.dataHash["visualHtml"].replace(RegExp.$1, "");
					}

					this.create_data_image(data);
				}
			},

			create_data_image: function(data){
				if(data){
					var img = new Image();
					var self = this;

					this.has_drawn = true;

					img.onload = function(){
						self.context.drawImage(this, 0, 0);
					};

					img.src = data;
				}
			},

			set_colour: function(update_color){
				var rgb = this.get_pixel_colour();

				if(rgb){
					var hex = this.rgb_2_hex(rgb[0], rgb[1], rgb[2]);

					if(update_color){
						this.context.shadowColor = "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", .5)";
						this.stroke_color = hex;
					}

					$("#pd_canvas_info span#stroke_color").text("#" + hex + " (" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")");
				}
			},

			get_pixel_colour: function(){
				var img_data = this.context.getImageData(this.mouse.x, this.mouse.y, 1, 1);

				if(img_data && img_data.data){
					return img_data.data;
				}

				return null;
			},

			build_canvas_controls: function(){
				var controls = $("<span id='pd_canvas_controls'></span>");
				var colour = $("<img src='http://images.proboards.com/v5/images/bbcode/color.png' alt='Color' title='color' /><br />");
				var self = this;

				colour.colorPicker({
					hex: self.stroke_color,

					update: function(hex){
						self.stroke_color = hex;
						self.context.strokeStyle = "#" + hex;

						var rgb = self.hex_2_rgb(self.stroke_color);

						self.context.shadowColor = "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", .5)";
						$("#pd_canvas_info span#stroke_color").text("#" + hex + " (" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")");
					}
				});

				controls.append(colour);

				var stroke_minus = $("<img src='" + this.images.strokeminus + "' alt='Decrease Stroke Width' title='Decrease Stroke Width' />");
				var stroke_plus = $("<img src='" + this.images.strokeplus + "' alt='Increase Stroke Width' title='Increase Stroke Width' />");
				var star = $("<img id='pd_canvas_star' src='" + this.images.star_inactive + "' alt='Star' title='Star' />");
				var spray = $("<img id='pd_canvas_spray' src='" + this.images.spray_inactive + "' alt='Spray' title='Spray' />");
				var dropper = $("<img id='pd_canvas_dropper' src='" + this.images.dropper_inactive + "' alt='Eye Dropper' title='Eye Dropper' />");
				var eraser = $("<img id='pd_canvas_eraser' src='" + this.images.eraser_inactive + "' alt='Eraser' title='Eraser' />");

				stroke_minus.click(function(){
					self.stroke_width -= (self.stroke_width > 1)? 1 : 0;
					$("#pd_canvas_info span#stroke_width").text(self.stroke_width);
				});

				stroke_plus.click(function(){
					self.stroke_width += (self.stroke_width < 50)? 1 : 0;
					$("#pd_canvas_info span#stroke_width").text(self.stroke_width);
				});

				controls.append(stroke_minus);
				controls.append($("<br />"));
				controls.append(stroke_plus);
				controls.append($("<br />"));

				star.click(function(){
					self.reset_active_ubbc("star");
					self.drawing_star = !self.drawing_star;

					if(self.drawing_star){
						self.canvas.css("cursor", "url(" + self.images.star + ") 0 0, pointer");
					} else {
						self.reset_cursor();
					}

					$(this).attr("src", (self.drawing_star)? self.images.star_active : self.images.star_inactive);
				});

				controls.append(star);
				controls.append($("<br />"));

				spray.click(function(){
					self.reset_active_ubbc("spray");
					self.drawing_spray = !self.drawing_spray;

					if(self.drawing_spray){
						self.canvas.css("cursor", "url(" + self.images.can + ") 0 10, pointer");
					} else {
						self.reset_cursor();
					}

					$(this).attr("src", (self.drawing_spray)? self.images.spray_active : self.images.spray_inactive);
				});

				controls.append(spray);
				controls.append($("<br />"));

				dropper.click(function(){
					self.reset_active_ubbc("dropper");
					self.drawing_dropper = !self.drawing_dropper;

					if(self.drawing_dropper){
						self.canvas.css("cursor", "url(" + self.images.dropper + ") 0 20, pointer");
					} else {
						self.reset_cursor();
					}

					$(this).attr("src", (self.drawing_dropper)? self.images.dropper_active : self.images.dropper_inactive);
				});

				controls.append(dropper);
				controls.append($("<br />"));

				eraser.click(function(){
					self.reset_active_ubbc("eraser");
					self.drawing_eraser = !self.drawing_eraser;

					if(self.drawing_eraser){
						self.canvas.css("cursor", "url(" + self.images.eraser + ") 0 20, pointer");
					} else {
						self.reset_cursor();
					}

					$(this).attr("src", (self.drawing_eraser)? self.images.eraser_active : self.images.eraser_inactive);
				});

				controls.append(eraser);

				controls.find("img").css("cursor", "pointer");
				this.canvas.css("cursor", "url(" + this.images.brush + ") 0 20, pointer");

				return controls;
			},

			reset_cursor: function(){
				this.canvas.css("cursor", "url(" + this.images.brush + ") 0 20, pointer");
			},

			reset_active_ubbc: function(ignore){
				var ubbc = $("#pd_canvas_controls img[id^=pd_canvas_]");
				var self = this;

				ubbc.each(function(){
					var id = $(this).attr("id");

					if(id && id.length && id.match(/^pd_canvas_(\w+)/i)){
						if(RegExp.$1 == ignore){
							return;
						}

						if(self.images[RegExp.$1 + "_inactive"]){
							$(this).attr("src", self.images[RegExp.$1 + "_inactive"]);

							if(self["drawing_" + RegExp.$1]){
								self["drawing_" + RegExp.$1] = false;
							}
						}
					}
				});

				var rgb = this.hex_2_rgb(this.stroke_color);

				$("#pd_canvas_info span#stroke_color").text("#" + this.stroke_color + " (" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")");

				this.canvas.css("cursor", "url(" + this.images.brush + ") 0 20, pointer");
				this.context.globalCompositeOperation = "source-over";
			},

			show_drawing_window: function(){
				var self = this;
				var draw_wrapper = $("<div title='Draw A Picture' style='text-align: center'></div>");

				draw_wrapper.append($("<div id='pd_canvas_wrapper' style='float: left'></div>"));
				draw_wrapper.append($("<div id='pd_canvas_controls' style='float: left; margin-left: 10px;'></div><br style='clear: both' />"));
				draw_wrapper.append($("<div id='pd_canvas_info' style='float: left; font-size: 10px;'><strong>Stroke Width:</strong> <span id='stroke_width' style='margin-right: 5px;'>" + this.stroke_width + "</span> <strong>Stroke Color:</strong> <span id='stroke_color'>#000000 (0, 0, 0)</span></div>"));

				draw_wrapper.find("#pd_canvas_wrapper").append(this.canvas);
				draw_wrapper.find("#pd_canvas_controls").append(this.build_canvas_controls());

				$(draw_wrapper).dialog({
					modal: true,
					height: 380,
					width: 620,
					resizable: false,
					draggable: false,
					dialogClass: "live_drawing_dialog",
					open: $.proxy(this.init_canvas, this),

					buttons: {

						Cancel: function(){
							self.has_drawn = false;
							self.clear_canvas();
							self.reset_active_ubbc();
							$(this).dialog("close");
						},

						Clear: function(){
							self.has_drawn = false;
							self.clear_canvas(true);
						},

						Save: function(){
							$(this).dialog("close");
						}

					}

				}).attr("title", "Draw A Picture");
			},

			clear_canvas: function(just_drawings){
				if(!just_drawings){
					this.stroke_color = "000000";
					this.stroke_width = 2,
					this.context.strokeStyle = "#" + this.stroke_color;
					this.reset_active_ubbc();

					$("#pd_canvas_info span#stroke_width").text(this.stroke_width);
					$("#pd_canvas_info span#stroke_color").text(this.stroke_color + " (0, 0, 0)");
				}

				this.context.clearRect(0, 0, this.canvas.get(0).width, this.canvas.get(0).height);
				this.context.restore();
			},

			erase: function(){
				this.context.beginPath();
				this.context.globalCompositeOperation = "destination-out";
				this.context.arc(this.mouse.x, this.mouse.y, this.stroke_width, 0, Math.PI * 2, false);
				this.context.fill();
			},

			init_canvas: function(){
				var self = this;
				var rgb = this.hex_2_rgb(this.stroke_color);

				this.context.strokeStyle = "#" + this.stroke_color;
				this.context.lineWidth = this.stroke_width;
				this.context.shadowColor = "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", .5)";

				this.canvas.mousedown(function(e){
					self.mouse_is_down = true;

					if(self.drawing_dropper || self.drawing_eraser){
						return;
					}

					self.has_drawn = true;

					var rgb = self.hex_2_rgb(self.stroke_color);

					self.context.lineWidth = self.stroke_width;
					self.context.shadowColor = "rgba(" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ", .5)";
					self.context.strokeStyle = "#" + self.stroke_color;

					if(self.drawing_spray){
						self.spray_timer = setInterval($.proxy(self.create.spray, self, e), 100);
					} else if(!self.drawing_star){
						self.context.beginPath();
						self.context.moveTo(self.mouse.x, self.mouse.y);
					}

					self.started = true;
				});

				this.canvas.mouseup(function(e){
					self.mouse_is_down = false;

					if(self.drawing_dropper || self.drawing_eraser){
						return;
					}

					self.started = false;
					clearInterval(self.spray_timer);
				});

				this.canvas.mouseout(function(e){
					self.started = self.mouse_is_down = false;
					clearInterval(self.spray_timer);

					var rgb = self.hex_2_rgb(this.stroke_color);

					$("#pd_canvas_info span#stroke_color").text("#" + self.stroke_color + " (" + rgb[0] + ", " + rgb[1] + ", " + rgb[2] + ")");
				});

				this.canvas.mousemove(function(e){
					self.mouse.x = (e.pageX - self.canvas.offset().left);
					self.mouse.y = (e.pageY - self.canvas.offset().top);

					if(self.drawing_dropper){
						self.set_colour(false);
					} else if(self.drawing_eraser){
						if(self.mouse_is_down){
							self.erase();
						}
					} else {
						clearInterval(self.spray_timer);

						if(self.started){
							if(self.drawing_star){
								$.proxy(self.create.star, self)(e);
							} else if(self.drawing_spray){
								$.proxy(self.create.spray, self)(e);
							} else {
								self.context.lineTo(self.mouse.x, self.mouse.y);
								self.context.stroke();
							}
						}
					}
				});

				this.canvas.click(function(e){
					self.mouse.x = (e.pageX - self.canvas.offset().left);
					self.mouse.y = (e.pageY - self.canvas.offset().top);

					if(self.drawing_dropper){
						self.set_colour(true);
					} else if(self.drawing_eraser){
						self.erase();
					} else {
						self.has_drawn = true;

						if(self.drawing_star){
							$.proxy(self.create.star, self)(e);
						} else if(self.drawing_spray){
							$.proxy(self.create.spray, self)(e);
						} else {
							self.context.lineTo(self.mouse.x, self.mouse.y);
							self.context.stroke();
						}
					}
				});
			},

			convert_canvas_data: function(){
				var datas = $("div.message div[href*=ProBoards-Live-Drawing]");

				datas.each(function(){
					var data = $(this).attr("title").split(";base64,")[1];

					if(data.match(/^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/)){
						var div = document.createElement("div");
						var img = document.createElement("img");

						img.src = $(this).attr("title");
						div.appendChild(img);

						$(this).parent().append(div);
						$(this).remove();
					}
				});
			},

			// Found on Stack Overflow

			hex_2_rgb: function(hex){
				var hex = parseInt(hex, 16);
				var r = (hex & 0xff0000) >> 16;
				var g = (hex & 0x00ff00) >> 8;
				var b = hex & 0x0000ff;

				return [r, g, b];
			},

			rgb_2_hex: function(r, g, b){
				return ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
			}

		};

	})().init();
});