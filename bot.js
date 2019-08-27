// Список команд:
// !лапа - Добавиться в очередь
// !хвост - удалиться из очереди
// !лапы - посмотреть список очереди

// Для модераторов
// !ЛАПА @ник - Добавить в начало очереди 
// !ХВОСТ @ник - Убрать из очереди
// !очистить - Очистить очередь
// !сбор - посмотреть время начала сбора
// !сбор 21:30 (или сбор 2130) - Задать время начала сбора (по умолчанию 20:10)
// !можно - В чат пишется сообщение, что набор открыт и ограничение на запись снимается
// * Очередь и время сбора автоматически сбрасываются на дефолтные с первой командой после полуночи
// Для корректной работы в корне нужны два фала - chat.txt и commands.txt

///* INITIALIZATION *///
const tmi = require('tmi.js');
require('dotenv').config();

const opts = {
  identity: {
    username: process.env.USERNAME,
    password: process.env.PASSWORD
  },
  channels: [
    process.env.SERVER1, 
    process.env.SERVER2
  ]
};
// Create a client with our options
const client = new tmi.client(opts);
// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
// Connect to Twitch:
client.connect();
// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}
///* END OF INITIALIZATION*///

hour_start = 20; // Час начала сбора
minute_start = 10; // Минута сбора
CURRENT_DAY = 0; // Текущий день для счётчика сброса очереди и времени
var moders = process.env.MODERS;
var q = []; // Очередь
const chat_log = 'chat.txt';
const sys_log = 'commands.txt';


var vote_comm = ['!Лапа', '!лапа'];
var rm_vote_comm = ['!хвост', '!Хвост'];
var list_comm = ['!лапы', 'Лапы', 'лапы'];
var mod_add_comm = '!ЛАПА';
var mod_rm_comm = '!ХВОСТ';
var mod_rm_list = ['!очистить', 'очистить', 'Очистить  очередь', 'чос', 'Чос'];
var mod_begin_time = '!сбор';
var mod_begin_time_now = '!можно';

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Проверка нового дня и очистка очереди
  if (get_current_day() != CURRENT_DAY) {
    q = [];
    CURRENT_DAY = get_current_day();
    client.say(target, `Новый день. Очередь очищена и время сбора установлено на ${hour_start}:${minute_start} по МСК`)
  }

  // Remove whitespace from chat message
  const commandName = msg.trim();

  // Имя отправителя
  var name = context['display-name'];

  // If the command is known, let's execute it
  // Добавление в очередь
  if (vote_comm.includes(commandName)) {
    if (allow_interval(hour_start, minute_start)) { // Проверка допустимого интервала времени
      add_q(target, name);
      write_to_file(name, commandName, sys_log);
    } else {
      client.say(target, `В очередь можно записываться с ${hour_start}:${minute_start} по МСК`)
    }
  // Удаление из очереди
  } else if (rm_vote_comm.includes(commandName)) {
    rm_q(target, name);
    write_to_file(name, commandName, sys_log);
  // Вывод списка очереди
  } else if (list_comm.includes(commandName)) {
    if (isEmpty(q)) {
      client.say(target, "Очередь пуста")
    } else {
      client.say(target, `Текущая очередь: ${concatenate_list(q)}`);
    }
  // Модераторское удаление. Нужен ник через @
  } else if (commandName.startsWith(mod_rm_comm)) {
    if (moders.includes(name)) { // Проверка на модератора
      mod_rm(commandName, target);
      write_to_file(name, commandName, sys_log);
    } else {
      client.say(target, 'У тебя нет прав модератора');
    }
  // Модераторское добавление
  } else if (commandName.startsWith(mod_add_comm)) {
    if (moders.includes(name)) {
      move_top(commandName, target);
      write_to_file(name, commandName, sys_log);
    } else {
      client.say(target, 'У тебя нет прав модератора');
    };
  // Очистка списка
  } else if (mod_rm_list.includes(commandName)) {
      if (moders.includes(name)) {
        q = [];
        client.say(target, 'Очередь очищена');
        write_to_file(name, commandName, sys_log);
      } else {
        client.say(target, 'У тебя нет прав модератора');
      }

    // СБОР СЕЙЧАС
  } else if (mod_begin_time_now.includes(commandName)) {
    if (moders.includes(name)) {
      hour_start = 00;
      minute_start = 00;
      client.say(target, 'Можно записываться в очередь!');
      write_to_file(name, commandName, sys_log);
    } else {
      client.say(target, 'У тебя нет прав модератора');
    };
  // Установка времени сбора
  } else if (commandName.startsWith(mod_begin_time)) {
    if (moders.includes(name)) {
      if (mod_begin_time != commandName) { // если не просто команда времени, а с цифрами
        if (set_date(commandName)) {
          set_date(commandName);
          client.say(target, `Время старта голосования изменено на ${hour_start}:${minute_start} по МСК`);
          write_to_file(name, commandName, sys_log);
        } else { // если цифр не 4
          client.say(target, 'Нужен 24х часовой формат и 4е цифры');
        };
      } else { // если просто написала команда сбора без всего
        client.say(target, `Время сбора в ${hour_start}:${minute_start} по МСК`);
      }
    } else {
      client.say(target, 'У тебя нет прав модератора');
    };
  // Лог ВСЕХ сообщений
  } else {
    write_to_file(name, commandName, chat_log);
  };
}



function add_q (target, name) {
  if (q.includes(name)) {
    client.say(target, `Ты уже в очереди ${name}`);
  } else {
    q.push(name);
    client.say(target, `${name} добавлен в очередь`);
  };}

function rm_q (target, name) {
  if (q.includes(name)) {
    q = q.filter(item => item !== name)

    client.say(target, `${name} удален из очереди`);
  } else {
    client.say(target, `Тебя не было в очереди ${name}`);
  };}

function mod_rm(commandName, target) {
  name = remove_before_dog(commandName);
    if (q.includes(name)) {
      q = q.filter(item => item !== name)
      client.say(target, `${name} Удалили из очереди`);
    } else {
      client.say(target, `В очереди не было ${name}`);
  };}

function move_top (commandName, target) {
  name = remove_before_dog(commandName);
  if (if_have_dog(commandName)) {
    if (q.includes(name)) {
      q = q.filter(item => item !== name);
      q.unshift(name);
      client.say(target, `${name} перемещен в начало очереди`);
    } else {
      q.unshift(name);
      client.say(target, `${name} добавлен в очередь и перемещен в начало`);
    };
  } else {
    client.say(target, `Имя нужно писать через собаку`);
  };}


// Запись в файл
const fs = require('fs');
function write_to_file(name, text, path) {
  fs.access(path, fs.F_OK, (err) => {
    if (err) {
      console.error(err);
      return;
    }
    var date = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    fs.appendFile(path, `${date} | ${name} | ${text}\n`, function(err) {
        if(err) {
            return console.log(err);
        }
      });
  });
}

// Проверка пустой ли список
function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

// Удаление собаки и всё что перед ней
function remove_before_dog(item) {
  return item.split("@").pop().replace(/ /g,'');
}

// Проверка, есть ли собака
function if_have_dog (item) {
  if (item.indexOf('@') > -1) {
    return true;
  } else { false; 
  }
}

// Объединяем список
function concatenate_list(item) {
  return item.join(', ');
}

// Преобразуем команду в числовое значение и переводим в ЧЧ:ММ
function set_date(text) {
  var raw = text.match(/\d/g).join("");
  if (raw.length === 4) {
    hour_start = raw.slice(0,2);
    minute_start = raw.slice(-2);
    return true;
  } else {
    return false;
  }
}

function allow_interval(hour_start, minute_start) {
  var start = Number(hour_start) * 60 + Number(minute_start);
  var end =  23 * 60 + 59; // 23:59
  var date = new Date(); 
  var now = date.getHours() * 60 + date.getMinutes();
  if(start <= now && now <= end) {
    return true;
  } else {
    return false;
  };
}

function get_current_day() {
  var date = new Date(); 
  return date.getDay();
}